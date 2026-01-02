import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ru" | "en" | "kk";

interface Translations {
  // Home page
  games: string;
  chooseGame: string;
  moreGamesSoon: string;
  players: string;

  // Game titles and descriptions
  impostor: string;
  impostorDesc: string;
  mafia: string;
  mafiaDesc: string;
  crocodile: string;
  crocodileDesc: string;
  whoami: string;
  whoamiDesc: string;
  casino: string;
  casinoDesc: string;

  // Common
  loading: string;
  error: string;
  playerCount: string;
  createGame: string;
  creating: string;
  newRound: string;
  newGame: string;
  hide: string;
  show: string;
  showRole: string;
  showMyRole: string;
  back: string;
  toHome: string;
  waitingForPlayers: string;
  playersViewed: string;
  playersConnected: string;
  gameCode: string;
  allSlotsTaken: string;
  registrationError: string;
  gameNotFound: string;
  askForLink: string;
  player: string;
  dontShowScreen: string;
  startGame: string;
  round: string;
  attempt: string;

  // Impostor
  impostorRole: string;
  secretWord: string;
  youAreImpostor: string;
  impostorHint: string;
  playerHint: string;
  startsFirst: string;
  youStart: string;
  impostorCreateHint1: string;
  impostorCreateHint2: string;
  specifyPlayers3to20: string;
  specifyPlayers4to20: string;
  specifyPlayers2to20: string;

  // Mafia
  mafiaRole: string;
  civilian: string;
  mafiaTeam: string;
  mafiaHint: string;
  civilianHint: string;
  cityFallsAsleep: string;
  allPlayersGotRoles: string;
  waiting: string;
  allRolesDistributed: string;
  yourRole: string;
  hideAndPass: string;
  findOutRole: string;
  pressWhenReady: string;
  mafiaCount: string;
  civiliansCount: string;
  mafiaCreateHint1: string;
  mafiaCreateHint2: string;

  // Crocodile
  youAreShowing: string;
  showWordWithGestures: string;
  currentlyGuessing: string;
  showWord: string;
  hideWord: string;
  onlyYouSee: string;
  pressToSeeWord: string;
  guessing: string;
  guessed: string;
  notGuessed: string;
  nowYouShow: string;
  playerShowing: string;
  waitYourTurn: string;
  watchAndPrepare: string;
  gameWillStartSoon: string;
  waitingForOtherPlayers: string;
  crocodileCreateHint1: string;
  crocodileCreateHint2: string;

  // Who Am I
  whoAmI: string;
  yourTask: string;
  characterOfPlayer: string;
  youDontKnowCharacter: string;
  askYesNoQuestions: string;
  playerDoesntKnowWhoHeIs: string;
  helpGuess: string;
  guessedNewRound: string;
  guessYourCharacter: string;
  onePlayerGetsWhoAmI: string;
  othersWillSeeCharacter: string;

  // Casino
  youAreGuessing: string;
  yourSymbol: string;
  spin: string;
  spinRoulette: string;
  pointToPlayers: string;
  playerConfirmsResult: string;
  playerPointedAtYou: string;
  didHeGuessSymbol: string;
  guessedNewCombination: string;
  wrongGuess: string;
  threeErrorsTurnPasses: string;
  shuffleSymbols: string;
  symbolsShuffled: string;
  waitingForGame: string;
  casinoCreateHint1: string;
  casinoCreateHint2: string;
  noAvailableSymbols: string;
  turnPassesToNext: string;
  correct: string;
  incorrect: string;

  // Errors
  errorCreatingGame: string;
  errorLoadingWords: string;
  errorLoadingCharacters: string;
}

const translations: Record<Language, Translations> = {
  ru: {
    games: "ИГРЫ",
    chooseGame: "Выбери игру для компании",
    moreGamesSoon: "Больше игр скоро появится",
    players: "игроков",

    impostor: "Самозванец",
    impostorDesc: "Найди того, кто не знает слово",
    mafia: "Мафия",
    mafiaDesc: "Город засыпает, просыпается мафия",
    crocodile: "Крокодил",
    crocodileDesc: "Покажи слово без слов",
    whoami: "Кто я?",
    whoamiDesc: "Угадай своего персонажа",
    casino: "Казино",
    casinoDesc: "Угадай комбинацию символов",

    loading: "Загрузка...",
    error: "Ошибка",
    playerCount: "Количество игроков",
    createGame: "Создать игру",
    creating: "Создание...",
    newRound: "Новый раунд",
    newGame: "Новая игра",
    hide: "Скрыть",
    show: "Показать",
    showRole: "Показать роль",
    showMyRole: "Показать мою роль",
    back: "Назад",
    toHome: "На главную",
    waitingForPlayers: "Ожидание игроков...",
    playersViewed: "игроков посмотрели",
    playersConnected: "игроков подключились",
    gameCode: "Код игры",
    allSlotsTaken: "Все места заняты",
    registrationError: "Ошибка регистрации",
    gameNotFound: "Игра не найдена",
    askForLink: "Попросите ссылку у организатора",
    player: "Игрок",
    dontShowScreen: "Никому не показывайте экран",
    startGame: "Начать игру",
    round: "Раунд",
    attempt: "Попытка",

    impostorRole: "САМОЗВАНЕЦ",
    secretWord: "Секретное слово",
    youAreImpostor: "Твоя роль",
    impostorHint: "Ты не знаешь слово. Притворяйся, что знаешь.",
    playerHint: "Один из игроков — самозванец. Он не знает это слово.",
    startsFirst: "Первым начинает",
    youStart: "🎯 Вы начинаете!",
    impostorCreateHint1: "Один из игроков — самозванец.",
    impostorCreateHint2: "Он не знает секретное слово.",
    specifyPlayers3to20: "Укажите от 3 до 20 игроков",
    specifyPlayers4to20: "Укажите от 4 до 20 игроков",
    specifyPlayers2to20: "Укажите от 2 до 20 игроков",

    mafiaRole: "МАФИЯ",
    civilian: "МИРНЫЙ ЖИТЕЛЬ",
    mafiaTeam: "Твоя команда",
    mafiaHint: "Ты знаешь, кто в твоей команде. Убей всех мирных жителей.",
    civilianHint: "Найди и разоблачи мафию. Не дай себя обмануть.",
    cityFallsAsleep: "Город засыпает...",
    allPlayersGotRoles: "Все игроки получили роли",
    waiting: "Ожидание...",
    allRolesDistributed: "Все роли уже распределены",
    yourRole: "Твоя роль",
    hideAndPass: "Скрыть и передать телефон",
    findOutRole: "Узнай свою роль",
    pressWhenReady: "Нажми, когда будешь готов.",
    mafiaCount: "Мафии",
    civiliansCount: "Мирных",
    mafiaCreateHint1: "Мафия убивает мирных жителей.",
    mafiaCreateHint2: "Мирные должны найти и казнить мафию.",

    youAreShowing: "🎭 Ты показываешь!",
    showWordWithGestures: "Покажи слово жестами",
    currentlyGuessing: "Сейчас угадывает",
    showWord: "Показать слово",
    hideWord: "Скрыть слово",
    onlyYouSee: "(Только ты смотришь!)",
    pressToSeeWord: "Нажми чтобы увидеть слово",
    guessing: "УГАДЫВАЙ!",
    guessed: "Угадал!",
    notGuessed: "Не угадал",
    nowYouShow: "Теперь ты показываешь!",
    playerShowing: "показывает",
    waitYourTurn: "Жди свою очередь",
    watchAndPrepare: "Смотри и готовься!",
    gameWillStartSoon: "Игра скоро начнётся",
    waitingForOtherPlayers: "Ожидание игроков...",
    crocodileCreateHint1: "Объясни слово жестами, мимикой",
    crocodileCreateHint2: "или рисунком — но не говори!",

    whoAmI: "КТО Я?",
    yourTask: "Твоя задача",
    characterOfPlayer: "Персонаж игрока",
    youDontKnowCharacter: "Ты не знаешь своего персонажа.",
    askYesNoQuestions: "Задавай вопросы с ответами Да/Нет.",
    playerDoesntKnowWhoHeIs: "не знает кто он.",
    helpGuess: "Помоги ему угадать, отвечая на вопросы.",
    guessedNewRound: "Угадал! Новый раунд",
    guessYourCharacter: "Угадай своего персонажа",
    onePlayerGetsWhoAmI: "Один игрок получит \"Кто я?\",",
    othersWillSeeCharacter: "остальные увидят его персонажа.",

    youAreGuessing: "ВЫ УГАДЫВАЕТЕ",
    yourSymbol: "Твой символ",
    spin: "Крутить",
    spinRoulette: "🎰 Крутить рулетку",
    pointToPlayers: "Покажите на игроков с этими символами по порядку.",
    playerConfirmsResult: "Игрок, на которого вы указали, подтвердит результат.",
    playerPointedAtYou: "На вас указал угадывающий!",
    didHeGuessSymbol: "Он угадал ваш символ?",
    guessedNewCombination: "Угадал! Новый раунд.",
    wrongGuess: "Не угадал!",
    threeErrorsTurnPasses: "3 ошибки! Ход переходит к следующему игроку.",
    shuffleSymbols: "Перемешать символы",
    symbolsShuffled: "Символы перемешаны!",
    waitingForGame: "Ожидание начала игры...",
    casinoCreateHint1: "Один игрок угадывает комбинацию.",
    casinoCreateHint2: "Остальные — символы казино.",
    noAvailableSymbols: "Нет доступных символов",
    turnPassesToNext: "Ход переходит к следующему игроку!",
    correct: "Угадал",
    incorrect: "Не угадал",

    errorCreatingGame: "Ошибка создания игры",
    errorLoadingWords: "Не удалось загрузить слова",
    errorLoadingCharacters: "Не удалось загрузить персонажей",
  },
  en: {
    games: "GAMES",
    chooseGame: "Choose a party game",
    moreGamesSoon: "More games coming soon",
    players: "players",

    impostor: "Impostor",
    impostorDesc: "Find who doesn't know the word",
    mafia: "Mafia",
    mafiaDesc: "The city sleeps, mafia awakes",
    crocodile: "Charades",
    crocodileDesc: "Show the word without speaking",
    whoami: "Who Am I?",
    whoamiDesc: "Guess your character",
    casino: "Casino",
    casinoDesc: "Guess the symbol combination",

    loading: "Loading...",
    error: "Error",
    playerCount: "Number of players",
    createGame: "Create game",
    creating: "Creating...",
    newRound: "New round",
    newGame: "New game",
    hide: "Hide",
    show: "Show",
    showRole: "Show role",
    showMyRole: "Show my role",
    back: "Back",
    toHome: "Home",
    waitingForPlayers: "Waiting for players...",
    playersViewed: "players viewed",
    playersConnected: "players connected",
    gameCode: "Game code",
    allSlotsTaken: "All slots taken",
    registrationError: "Registration error",
    gameNotFound: "Game not found",
    askForLink: "Ask the host for a link",
    player: "Player",
    dontShowScreen: "Don't show your screen to anyone",
    startGame: "Start game",
    round: "Round",
    attempt: "Attempt",

    impostorRole: "IMPOSTOR",
    secretWord: "Secret word",
    youAreImpostor: "Your role",
    impostorHint: "You don't know the word. Pretend you do.",
    playerHint: "One player is the impostor. They don't know the word.",
    startsFirst: "Starts first",
    youStart: "🎯 You start!",
    impostorCreateHint1: "One player is the impostor.",
    impostorCreateHint2: "They don't know the secret word.",
    specifyPlayers3to20: "Specify 3 to 20 players",
    specifyPlayers4to20: "Specify 4 to 20 players",
    specifyPlayers2to20: "Specify 2 to 20 players",

    mafiaRole: "MAFIA",
    civilian: "CIVILIAN",
    mafiaTeam: "Your team",
    mafiaHint: "You know your teammates. Kill all civilians.",
    civilianHint: "Find and expose the mafia. Don't be fooled.",
    cityFallsAsleep: "The city falls asleep...",
    allPlayersGotRoles: "All players got their roles",
    waiting: "Waiting...",
    allRolesDistributed: "All roles already distributed",
    yourRole: "Your role",
    hideAndPass: "Hide and pass the phone",
    findOutRole: "Find out your role",
    pressWhenReady: "Press when ready.",
    mafiaCount: "Mafia",
    civiliansCount: "Civilians",
    mafiaCreateHint1: "Mafia kills civilians.",
    mafiaCreateHint2: "Civilians must find and execute the mafia.",

    youAreShowing: "🎭 You're showing!",
    showWordWithGestures: "Show the word with gestures",
    currentlyGuessing: "Currently guessing",
    showWord: "Show word",
    hideWord: "Hide word",
    onlyYouSee: "(Only you can see!)",
    pressToSeeWord: "Press to see the word",
    guessing: "GUESS!",
    guessed: "Guessed!",
    notGuessed: "Not guessed",
    nowYouShow: "Now you show!",
    playerShowing: "is showing",
    waitYourTurn: "Wait for your turn",
    watchAndPrepare: "Watch and prepare!",
    gameWillStartSoon: "Game will start soon",
    waitingForOtherPlayers: "Waiting for players...",
    crocodileCreateHint1: "Explain the word with gestures, facial expressions",
    crocodileCreateHint2: "or drawing — but don't speak!",

    whoAmI: "WHO AM I?",
    yourTask: "Your task",
    characterOfPlayer: "Character of Player",
    youDontKnowCharacter: "You don't know your character.",
    askYesNoQuestions: "Ask yes/no questions.",
    playerDoesntKnowWhoHeIs: "doesn't know who they are.",
    helpGuess: "Help them guess by answering questions.",
    guessedNewRound: "Guessed! New round",
    guessYourCharacter: "Guess your character",
    onePlayerGetsWhoAmI: "One player gets \"Who Am I?\",",
    othersWillSeeCharacter: "others will see their character.",

    youAreGuessing: "YOU'RE GUESSING",
    yourSymbol: "Your symbol",
    spin: "Spin",
    spinRoulette: "🎰 Spin the roulette",
    pointToPlayers: "Point to players with these symbols in order.",
    playerConfirmsResult: "The player you point to will confirm the result.",
    playerPointedAtYou: "The guesser pointed at you!",
    didHeGuessSymbol: "Did they guess your symbol?",
    guessedNewCombination: "Correct! New round.",
    wrongGuess: "Wrong!",
    threeErrorsTurnPasses: "3 errors! Turn passes to the next player.",
    shuffleSymbols: "Shuffle symbols",
    symbolsShuffled: "Symbols shuffled!",
    waitingForGame: "Waiting for game to start...",
    casinoCreateHint1: "One player guesses the combination.",
    casinoCreateHint2: "Others are casino symbols.",
    noAvailableSymbols: "No available symbols",
    turnPassesToNext: "Turn passes to the next player!",
    correct: "Correct",
    incorrect: "Incorrect",

    errorCreatingGame: "Error creating game",
    errorLoadingWords: "Failed to load words",
    errorLoadingCharacters: "Failed to load characters",
  },
  kk: {
    games: "ОЙЫНДАР",
    chooseGame: "Компания үшін ойын таңдаңыз",
    moreGamesSoon: "Көбірек ойындар жақында",
    players: "ойыншы",

    impostor: "Алдақ",
    impostorDesc: "Сөзді білмейтінді тап",
    mafia: "Мафия",
    mafiaDesc: "Қала ұйықтайды, мафия оянады",
    crocodile: "Қаздауыт",
    crocodileDesc: "Сөзді сөйлемей көрсет",
    whoami: "Мен кіммін?",
    whoamiDesc: "Кейіпкеріңді тап",
    casino: "Казино",
    casinoDesc: "Символдар комбинациясын тап",

    loading: "Жүктелуде...",
    error: "Қате",
    playerCount: "Ойыншылар саны",
    createGame: "Ойын құру",
    creating: "Құрылуда...",
    newRound: "Жаңа раунд",
    newGame: "Жаңа ойын",
    hide: "Жасыру",
    show: "Көрсету",
    showRole: "Рөлді көрсету",
    showMyRole: "Менің рөлімді көрсету",
    back: "Артқа",
    toHome: "Басты бет",
    waitingForPlayers: "Ойыншыларды күту...",
    playersViewed: "ойыншы көрді",
    playersConnected: "ойыншы қосылды",
    gameCode: "Ойын коды",
    allSlotsTaken: "Барлық орындар бос емес",
    registrationError: "Тіркеу қатесі",
    gameNotFound: "Ойын табылмады",
    askForLink: "Ұйымдастырушыдан сілтеме сұраңыз",
    player: "Ойыншы",
    dontShowScreen: "Экранды ешкімге көрсетпеңіз",
    startGame: "Ойынды бастау",
    round: "Раунд",
    attempt: "Әрекет",

    impostorRole: "АЛДАҚ",
    secretWord: "Құпия сөз",
    youAreImpostor: "Сіздің рөліңіз",
    impostorHint: "Сіз сөзді білмейсіз. Білетін болып көріңіз.",
    playerHint: "Ойыншылардың бірі — алдақ. Ол бұл сөзді білмейді.",
    startsFirst: "Бірінші бастайды",
    youStart: "🎯 Сіз бастайсыз!",
    impostorCreateHint1: "Ойыншылардың бірі — алдақ.",
    impostorCreateHint2: "Ол құпия сөзді білмейді.",
    specifyPlayers3to20: "3-тен 20-ға дейін ойыншы көрсетіңіз",
    specifyPlayers4to20: "4-тен 20-ға дейін ойыншы көрсетіңіз",
    specifyPlayers2to20: "2-ден 20-ға дейін ойыншы көрсетіңіз",

    mafiaRole: "МАФИЯ",
    civilian: "БЕЙБІТ ТҰРҒЫН",
    mafiaTeam: "Сіздің команда",
    mafiaHint: "Сіз командаңызды білесіз. Барлық бейбіт тұрғындарды жойыңыз.",
    civilianHint: "Мафияны тауып, әшкерелеңіз. Алданбаңыз.",
    cityFallsAsleep: "Қала ұйықтайды...",
    allPlayersGotRoles: "Барлық ойыншылар рөлдерін алды",
    waiting: "Күту...",
    allRolesDistributed: "Барлық рөлдер таратылды",
    yourRole: "Сіздің рөліңіз",
    hideAndPass: "Жасырып, телефонды беріңіз",
    findOutRole: "Рөліңізді біліңіз",
    pressWhenReady: "Дайын болғанда басыңыз.",
    mafiaCount: "Мафия",
    civiliansCount: "Бейбіт",
    mafiaCreateHint1: "Мафия бейбіт тұрғындарды өлтіреді.",
    mafiaCreateHint2: "Бейбіттер мафияны тауып, жазалауы керек.",

    youAreShowing: "🎭 Сіз көрсетесіз!",
    showWordWithGestures: "Сөзді қимылмен көрсетіңіз",
    currentlyGuessing: "Қазір болжайды",
    showWord: "Сөзді көрсету",
    hideWord: "Сөзді жасыру",
    onlyYouSee: "(Тек сіз көресіз!)",
    pressToSeeWord: "Сөзді көру үшін басыңыз",
    guessing: "БОЛЖАҢЫЗ!",
    guessed: "Болжады!",
    notGuessed: "Болжамады",
    nowYouShow: "Енді сіз көрсетесіз!",
    playerShowing: "көрсетеді",
    waitYourTurn: "Кезегіңізді күтіңіз",
    watchAndPrepare: "Қараңыз және дайындалыңыз!",
    gameWillStartSoon: "Ойын жақында басталады",
    waitingForOtherPlayers: "Ойыншыларды күту...",
    crocodileCreateHint1: "Сөзді қимылмен, мимикамен түсіндіріңіз",
    crocodileCreateHint2: "немесе сурет салыңыз — бірақ сөйлемеңіз!",

    whoAmI: "МЕН КІММІН?",
    yourTask: "Сіздің тапсырмаңыз",
    characterOfPlayer: "Ойыншының кейіпкері",
    youDontKnowCharacter: "Сіз кейіпкеріңізді білмейсіз.",
    askYesNoQuestions: "Иә/Жоқ жауаптарымен сұрақтар қойыңыз.",
    playerDoesntKnowWhoHeIs: "ол кім екенін білмейді.",
    helpGuess: "Сұрақтарға жауап беріп, болжауға көмектесіңіз.",
    guessedNewRound: "Болжады! Жаңа раунд",
    guessYourCharacter: "Кейіпкеріңізді табыңыз",
    onePlayerGetsWhoAmI: "Бір ойыншы \"Мен кіммін?\" алады,",
    othersWillSeeCharacter: "қалғандары оның кейіпкерін көреді.",

    youAreGuessing: "СІЗ БОЛЖАЙСЫЗ",
    yourSymbol: "Сіздің символ",
    spin: "Айналдыру",
    spinRoulette: "🎰 Рулетканы айналдыру",
    pointToPlayers: "Осы символдары бар ойыншыларды ретімен көрсетіңіз.",
    playerConfirmsResult: "Сіз көрсеткен ойыншы нәтижені растайды.",
    playerPointedAtYou: "Болжаушы сізді көрсетті!",
    didHeGuessSymbol: "Ол сіздің символды тапты ма?",
    guessedNewCombination: "Дұрыс! Жаңа раунд.",
    wrongGuess: "Қате!",
    threeErrorsTurnPasses: "3 қате! Кезек келесі ойыншыға өтеді.",
    shuffleSymbols: "Символдарды араластыру",
    symbolsShuffled: "Символдар араласты!",
    waitingForGame: "Ойынның басталуын күту...",
    casinoCreateHint1: "Бір ойыншы комбинацияны болжайды.",
    casinoCreateHint2: "Қалғандары — казино символдары.",
    noAvailableSymbols: "Қолжетімді символдар жоқ",
    turnPassesToNext: "Кезек келесі ойыншыға өтеді!",
    correct: "Дұрыс",
    incorrect: "Қате",

    errorCreatingGame: "Ойын құру қатесі",
    errorLoadingWords: "Сөздерді жүктеу мүмкін болмады",
    errorLoadingCharacters: "Кейіпкерлерді жүктеу мүмкін болмады",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("game-language");
    return (saved as Language) || "ru";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("game-language", lang);
  };

  useEffect(() => {
    const saved = localStorage.getItem("game-language");
    if (saved && (saved === "ru" || saved === "en" || saved === "kk")) {
      setLanguageState(saved);
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

export const languageNames: Record<Language, string> = {
  ru: "Русский",
  en: "English",
  kk: "Қазақша",
};
