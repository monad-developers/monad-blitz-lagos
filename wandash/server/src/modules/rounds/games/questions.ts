export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
}

/**
 * Dummy question bank — 25 questions across football, crypto/web3, space, 9ja politics, music.
 * This file should NOT be pushed to GitHub (.gitignore it).
 */
export const questionBank: QuizQuestion[] = [
  // ── Football ──
  {
    question: "Which country won the 2022 FIFA World Cup?",
    options: ["France", "Argentina", "Brazil", "Croatia"],
    correctIndex: 1,
  },
  {
    question: "Who holds the record for most Ballon d'Or awards?",
    options: ["Cristiano Ronaldo", "Lionel Messi", "Michel Platini", "Johan Cruyff"],
    correctIndex: 1,
  },
  {
    question: "Which club has won the most UEFA Champions League titles?",
    options: ["AC Milan", "Barcelona", "Real Madrid", "Bayern Munich"],
    correctIndex: 2,
  },
  {
    question: "What year was the first FIFA World Cup held?",
    options: ["1928", "1930", "1934", "1926"],
    correctIndex: 1,
  },
  {
    question: "Which African country reached the World Cup quarterfinals in 2010?",
    options: ["Nigeria", "Cameroon", "Ghana", "Senegal"],
    correctIndex: 2,
  },

  // ── Crypto / Web3 ──
  {
    question: "What is the maximum supply of Bitcoin?",
    options: ["18 million", "21 million", "100 million", "Unlimited"],
    correctIndex: 1,
  },
  {
    question: "Who created Ethereum?",
    options: ["Satoshi Nakamoto", "Charles Hoskinson", "Vitalik Buterin", "Gavin Wood"],
    correctIndex: 2,
  },
  {
    question: "What does 'DeFi' stand for?",
    options: ["Decentralized Finance", "Defined Financial", "Deferred Financing", "Digital Fidelity"],
    correctIndex: 0,
  },
  {
    question: "Which consensus mechanism does Ethereum currently use?",
    options: ["Proof of Work", "Proof of Stake", "Delegated Proof of Stake", "Proof of Authority"],
    correctIndex: 1,
  },
  {
    question: "What is a 'gas fee' in Ethereum?",
    options: ["A reward for miners", "The cost to execute a transaction", "A staking requirement", "A governance vote cost"],
    correctIndex: 1,
  },

  // ── Space ──
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    correctIndex: 2,
  },
  {
    question: "Who was the first human in space?",
    options: ["Neil Armstrong", "Buzz Aldrin", "Yuri Gagarin", "John Glenn"],
    correctIndex: 2,
  },
  {
    question: "How many planets are in our solar system?",
    options: ["7", "8", "9", "10"],
    correctIndex: 1,
  },
  {
    question: "What is the largest planet in the solar system?",
    options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
    correctIndex: 2,
  },
  {
    question: "Which space agency launched the James Webb Space Telescope?",
    options: ["SpaceX", "NASA", "ESA", "Roscosmos"],
    correctIndex: 1,
  },

  // ── 9ja Politics ──
  {
    question: "Who was the first President of Nigeria?",
    options: ["Obafemi Awolowo", "Nnamdi Azikiwe", "Tafawa Balewa", "Yakubu Gowon"],
    correctIndex: 1,
  },
  {
    question: "In what year did Nigeria gain independence?",
    options: ["1957", "1960", "1963", "1966"],
    correctIndex: 1,
  },
  {
    question: "How many states does Nigeria have?",
    options: ["30", "36", "24", "48"],
    correctIndex: 1,
  },
  {
    question: "Which city is the capital of Nigeria?",
    options: ["Lagos", "Abuja", "Ibadan", "Kano"],
    correctIndex: 1,
  },
  {
    question: "What is the name of the Nigerian currency?",
    options: ["Cedi", "Rand", "Naira", "Shilling"],
    correctIndex: 2,
  },

  // ── Music ──
  {
    question: "Which Nigerian artist won the Grammy for Best Global Music Album in 2024?",
    options: ["Davido", "Wizkid", "Burna Boy", "Tems"],
    correctIndex: 2,
  },
  {
    question: "What genre is Fela Kuti known for pioneering?",
    options: ["Highlife", "Juju", "Afrobeat", "Fuji"],
    correctIndex: 2,
  },
  {
    question: "Which artist released the album 'Thriller'?",
    options: ["Prince", "Michael Jackson", "Stevie Wonder", "Whitney Houston"],
    correctIndex: 1,
  },
  {
    question: "Beyoncé is the lead vocalist of which former group?",
    options: ["TLC", "Destiny's Child", "En Vogue", "SWV"],
    correctIndex: 1,
  },
  {
    question: "Which country does the music genre 'K-Pop' originate from?",
    options: ["Japan", "China", "South Korea", "Thailand"],
    correctIndex: 2,
  },
]

/** Pick N random questions from the bank (Fisher-Yates on a copy) */
export function pickRandomQuestions(count: number): QuizQuestion[] {
  const pool = [...questionBank]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, Math.min(count, pool.length))
}
