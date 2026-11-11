import { setLang } from '@/i18n'

// Texty závisí na jazyce appky, ten se jinak bere ze systému. Testy je čtou
// anglicky na každém počítači; kdo testuje češtinu, přepne si ji sám.
setLang('en')
