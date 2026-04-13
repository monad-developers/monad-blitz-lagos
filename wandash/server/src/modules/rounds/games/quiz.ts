import type { MiniGameHandler, RoundConfig, RoundWinnerResult } from "./types"
import { pickRandomQuestions, type QuizQuestion } from "./questions"
import { createLogger } from "../../../lib/logger"

const log = createLogger("QuizGame")

interface PlayerQuizState {
  correctCount: number
  answeredIndices: Set<number>
}

interface QuizRoundState {
  questions: QuizQuestion[]
  players: Map<string, PlayerQuizState>
  questionCount: number
  timePerQuestion: number // seconds
}

const roundStates = new Map<string, QuizRoundState>()

export const quizHandler: MiniGameHandler = {
  gameType: "quiz",

  getConfig(gameId: string): RoundConfig {
    const questions = pickRandomQuestions(5)
    const state: QuizRoundState = {
      questions,
      players: new Map(),
      questionCount: questions.length,
      timePerQuestion: 10,
    }
    roundStates.set(gameId, state)

    // Send questions to client WITHOUT correctIndex
    const clientQuestions = questions.map((q, i) => ({
      index: i,
      question: q.question,
      options: q.options,
    }))

    return {
      gameType: "quiz",
      questions: clientQuestions,
      questionCount: state.questionCount,
      timePerQuestion: state.timePerQuestion,
      roundDuration: state.questionCount * state.timePerQuestion + 5, // extra buffer
    }
  },

  handleAction(gameId, walletAddress, action, payload) {
    if (action !== "ANSWER") return null

    const state = roundStates.get(gameId)
    if (!state) return null

    const { questionIndex, answer } = payload as { questionIndex: number; answer: number }
    if (questionIndex < 0 || questionIndex >= state.questions.length) {
      return { response: { type: "ANSWER_RESULT", error: "Invalid question index" } }
    }

    // Init player state
    if (!state.players.has(walletAddress)) {
      state.players.set(walletAddress, { correctCount: 0, answeredIndices: new Set() })
    }

    const ps = state.players.get(walletAddress)!

    // Prevent double-answering
    if (ps.answeredIndices.has(questionIndex)) {
      return { response: { type: "ANSWER_RESULT", error: "Already answered", questionIndex } }
    }
    ps.answeredIndices.add(questionIndex)

    const question = state.questions[questionIndex]
    const correct = answer === question.correctIndex
    if (correct) ps.correctCount++

    log.debug("Quiz answer", { gameId, walletAddress, questionIndex, correct })

    return {
      response: {
        type: "ANSWER_RESULT",
        questionIndex,
        correct,
        correctAnswer: question.correctIndex,
        yourScore: ps.correctCount,
      },
    }
  },

  computeWinners(gameId): RoundWinnerResult {
    const state = roundStates.get(gameId)
    if (!state || state.players.size === 0) {
      roundStates.delete(gameId)
      return { winners: [], maxWinnersPerRound: 2 }
    }

    // Sort by correctCount descending
    const sorted = Array.from(state.players.entries())
      .sort((a, b) => b[1].correctCount - a[1].correctCount)

    // Take top 2 winners (ties broken by insertion order / first to answer)
    const winners = sorted.slice(0, 2).map(([addr]) => addr)

    log.info("Quiz round winners", { gameId, winners, scores: sorted.slice(0, 3).map(([a, s]) => ({ addr: a, score: s.correctCount })) })
    roundStates.delete(gameId)

    return { winners, maxWinnersPerRound: 2 }
  },

  cleanup(gameId) {
    roundStates.delete(gameId)
  },

  /** Read-only access to current round config (for late joiners) */
  peekConfig(gameId: string): RoundConfig | null {
    const state = roundStates.get(gameId)
    if (!state) return null

    const clientQuestions = state.questions.map((q, i) => ({
      index: i,
      question: q.question,
      options: q.options,
    }))

    return {
      gameType: "quiz",
      questions: clientQuestions,
      questionCount: state.questionCount,
      timePerQuestion: state.timePerQuestion,
      roundDuration: state.questionCount * state.timePerQuestion + 5,
    }
  },
}
