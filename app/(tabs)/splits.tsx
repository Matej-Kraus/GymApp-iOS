import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { SPLIT_TEMPLATES, createId, findExercise } from '@/core'
import type { Split } from '@/core'
import { choose, confirm } from '@/lib/platform'
import { useAppState } from '@/state/AppStateContext'
import {
  Button,
  EmptyState,
  GUTTER,
  IconButton,
  PageHeader,
  Row,
  Rule,
  Screen,
  SectionTitle,
  Sheet,
} from '@/components/ui'
import { colors } from '@/theme/colors'
import { tr } from '@/i18n'
import { exName } from '@/lib/exerciseName'

type PlanAction = 'start' | 'edit' | 'duplicate' | 'delete' | 'cancel'

/** Plány: tréninkové plány po programech, šablony a vlastní cviky. */
export default function Plans() {
  const { data, deleteSplit, duplicateSplit, addSplit, updateSettings } = useAppState()
  const { splits } = data
  const router = useRouter()
  const t = tr()
  const p = t.plans
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const activeId = data.settings.activeProgramId

  // Programy = skupiny plánů ze šablony; plány bez skupiny jsou „vlastní".
  const groups = useMemo(() => {
    const map = new Map<string, { name: string; splits: Split[] }>()
    for (const split of splits) {
      const key = split.groupId ?? ''
      if (!map.has(key)) map.set(key, { name: split.groupName ?? p.custom, splits: [] })
      map.get(key)!.splits.push(split)
    }
    return [...map.entries()]
  }, [splits, p.custom])

  function applyTemplate(tpl: (typeof SPLIT_TEMPLATES)[number]) {
    tpl.splits.forEach((s) =>
      addSplit({
        id: createId(),
        name: s.name,
        exerciseIds: s.exerciseIds,
        groupId: tpl.groupId,
        groupName: tpl.name,
      }),
    )
    // První přidaný program se rovnou stane aktivním.
    if (!activeId) updateSettings({ activeProgramId: tpl.groupId })
    setTemplatesOpen(false)
  }

  async function openMenu(split: Split) {
    const picked = await choose<PlanAction>({
      title: split.name,
      options: [
        { label: p.menuStart, value: 'start', style: 'neutral' },
        { label: p.menuEdit, value: 'edit', style: 'neutral' },
        { label: p.menuDuplicate, value: 'duplicate', style: 'neutral' },
        { label: p.menuDelete, value: 'delete', style: 'destructive' },
        { label: t.common.cancel, value: 'cancel', style: 'cancel' },
      ],
    })
    if (picked === 'start') router.push({ pathname: '/workout', params: { splitId: split.id } })
    if (picked === 'edit') router.push({ pathname: '/split-form', params: { id: split.id } })
    if (picked === 'duplicate') duplicateSplit(split.id)
    if (picked === 'delete') {
      const yes = await confirm({
        title: p.deleteTitle,
        message: p.deleteText,
        confirmLabel: t.common.delete,
        destructive: true,
      })
      if (yes) deleteSplit(split.id)
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 40 }}>
        <View className="mt-2">
          <PageHeader
            title={p.title}
            action={<IconButton icon="add" label={p.newPlan} onPress={() => router.push('/split-form')} />}
          />
        </View>

        {splits.length === 0 ? (
          <EmptyState
            title={p.emptyTitle}
            description={p.emptyText}
            action={
              <View style={{ gap: 8 }}>
                <Button title={p.fromTemplate} onPress={() => setTemplatesOpen(true)} />
                <Button title={p.newPlan} variant="secondary" onPress={() => router.push('/split-form')} />
              </View>
            }
          />
        ) : (
          <>
            {groups.map(([groupId, group]) => {
              const isActive = !!groupId && groupId === activeId
              return (
                <View key={groupId || 'custom'} className="mt-7">
                  <SectionTitle
                    action={
                      !groupId ? undefined : isActive ? (
                        <Text className="text-[14px] text-muted">{p.active}</Text>
                      ) : (
                        <Pressable
                          onPress={() => updateSettings({ activeProgramId: groupId })}
                          accessibilityRole="button"
                          hitSlop={10}
                          className="active:opacity-60"
                        >
                          <Text className="text-[14px] font-medium text-white underline">{p.setActive}</Text>
                        </Pressable>
                      )
                    }
                  >
                    {group.name}
                  </SectionTitle>
                  <Rule />
                  {group.splits.map((split) => {
                    const names = split.exerciseIds
                      .slice(0, 3)
                      .map((id) => findExercise(id, data.customExercises))
                      .map((e) => (e ? exName(e) : null))
                      .filter(Boolean)
                      .join(', ')
                    const more = split.exerciseIds.length > 3 ? ', …' : ''
                    return (
                      <View key={split.id}>
                        <View className="flex-row items-center" style={{ marginRight: -10 }}>
                          <Row
                            className="flex-1"
                            onPress={() => router.push({ pathname: '/split-form', params: { id: split.id } })}
                            accessibilityLabel={`${p.menuEdit}: ${split.name}`}
                          >
                            <View className="flex-1">
                              <Text className="text-[17px] font-medium text-white">{split.name}</Text>
                              <Text className="mt-0.5 text-[14px] text-muted" numberOfLines={1}>
                                {t.count.exercises(split.exerciseIds.length)}
                                {names ? `: ${names}${more}` : ''}
                              </Text>
                            </View>
                          </Row>
                          <IconButton
                            icon="ellipsis-horizontal"
                            label={`${p.more}: ${split.name}`}
                            onPress={() => openMenu(split)}
                          />
                        </View>
                        <Rule />
                      </View>
                    )
                  })}
                </View>
              )
            })}
            <Text className="mt-3 text-[13px] leading-[18px] text-faint">{p.activeHint}</Text>
            <Button
              className="mt-5"
              variant="secondary"
              title={p.fromTemplate}
              onPress={() => setTemplatesOpen(true)}
            />
          </>
        )}

        <View className="mt-9">
          <SectionTitle>{p.exercises}</SectionTitle>
          <Rule />
          <Row onPress={() => router.push('/exercises')}>
            <Text className="flex-1 text-[17px] text-white">{p.library}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Row>
          <Rule />
          <Row onPress={() => router.push('/custom-exercise')}>
            <Text className="flex-1 text-[17px] text-white">{p.addCustom}</Text>
            <Ionicons name="add" size={20} color={colors.faint} />
          </Row>
          <Rule />
          {data.customExercises.map((ex) => (
            <View key={ex.id}>
              <Row>
                <Text className="flex-1 text-[16px] text-white" numberOfLines={1}>
                  {exName(ex)}
                </Text>
                <Text className="text-[14px] text-muted">{t.muscle[ex.muscleGroup]}</Text>
              </Row>
              <Rule />
            </View>
          ))}
        </View>
      </ScrollView>

      <Sheet visible={templatesOpen} onClose={() => setTemplatesOpen(false)} title={p.templates} scroll>
        {SPLIT_TEMPLATES.map((tpl) => (
          <View key={tpl.groupId}>
            <Rule />
            <Row onPress={() => applyTemplate(tpl)}>
              <View className="flex-1">
                <Text className="text-[17px] font-medium text-white">{tpl.name}</Text>
                <Text className="mt-0.5 text-[14px] leading-[19px] text-muted">
                  {p.templateDays(tpl.splits.length)}: {tpl.splits.map((s) => s.name).join(', ')}
                </Text>
              </View>
              <Ionicons name="add" size={20} color={colors.faint} />
            </Row>
          </View>
        ))}
        <Rule />
        <View className="h-4" />
      </Sheet>
    </Screen>
  )
}
