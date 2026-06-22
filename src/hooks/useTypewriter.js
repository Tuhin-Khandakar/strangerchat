import { useState, useEffect, useRef } from 'react'

export function useTypewriter(words, { typeSpeed = 100, deleteSpeed = 50, pauseTime = 2000, prePause = 500 } = {}) {
  const [text, setText] = useState('')
  const indexRef = useRef({ wordIndex: 0, charIndex: 0, isDeleting: false })

  useEffect(() => {
    const timeout = setTimeout(() => {
      const idx = indexRef.current
      const word = words[idx.wordIndex]
      if (idx.isDeleting) {
        idx.charIndex--
        setText(word.substring(0, idx.charIndex))
      } else {
        idx.charIndex++
        setText(word.substring(0, idx.charIndex))
      }
      if (!idx.isDeleting && idx.charIndex === word.length) {
        setTimeout(() => { idx.isDeleting = true }, pauseTime)
        return
      }
      if (idx.isDeleting && idx.charIndex === 0) {
        idx.isDeleting = false
        idx.wordIndex = (idx.wordIndex + 1) % words.length
      }
    }, indexRef.current.isDeleting ? deleteSpeed : typeSpeed)
    return () => clearTimeout(timeout)
  }, [text, words, typeSpeed, deleteSpeed, pauseTime])

  return text
}
