import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { io } from 'socket.io-client'

export default function ChatPage() {
  const [state, setState] = useState('idle')
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [onlineCount, setOnlineCount] = useState('—')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showMatchOverlay, setShowMatchOverlay] = useState(false)
  const [upgradeBanner, setUpgradeBanner] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [stars, setStars] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [email, setEmail] = useState('')
  const [modals, setModals] = useState({
    matchLimit: false,
    premium: false,
    review: false,
    email: false
  })

  const chatRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('chat-body')
    return () => document.body.classList.remove('chat-body')
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, typing, partnerTyping])

  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      setShowScrollBtn(!isNearBottom)
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(function () {
    var theme = document.documentElement.getAttribute('data-theme')
    document.querySelectorAll('.theme-toggle svg use').forEach(function (u) {
      u.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon')
    })
  }, [])

  // Setup Socket.IO connection
  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('online_count', (count) => {
      setOnlineCount(count)
    })

    socket.on('sys_info', (msg) => {
      setMessages(prev => [...prev, { text: msg, sender: 'system' }])
    })

    socket.on('sys_error', (msg) => {
      setMessages(prev => [...prev, { text: `Error: ${msg}`, sender: 'system' }])
    })

    socket.on('banned', (data) => {
      setMessages(prev => [...prev, { text: `Banned: ${data.reason}`, sender: 'system' }])
      setState('idle')
    })

    socket.on('searching', () => {
      setState('searching')
      setMessages([{ text: 'Looking for a stranger...', sender: 'system' }])
    })

    socket.on('matched', (data) => {
      setState('chatting')
      setShowMatchOverlay(true)
      setMessages([
        { text: 'Encrypted connection established', sender: 'system' },
        { text: "You've been matched! Say hi.", sender: 'system' }
      ])
      const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        tx: (Math.random() - 0.5) * 300,
        ty: (Math.random() - 0.5) * 300,
        delay: Math.random() * 0.3,
        size: 4 + Math.random() * 4
      }))
      setMatchParticles(particles)
      setTimeout(() => { setShowMatchOverlay(false); setMatchParticles([]) }, 1400)
    })

    socket.on('receive_msg', (data) => {
      setMessages(prev => [...prev, { text: data.text, sender: 'stranger', time: data.timestamp }])
    })

    socket.on('partner_typing', (isTyping) => {
      setPartnerTyping(isTyping)
    })

    socket.on('partner_left', () => {
      setMessages(prev => [...prev, { text: 'Stranger has disconnected.', sender: 'system' }])
      setState('idle')
      setModals(prev => ({ ...prev, review: true }))
    })

    socket.on('show_upgrade', (data) => {
      if (data.reason === 'daily_limit') {
        setModals(prev => ({ ...prev, matchLimit: true }))
      } else if (data.reason === 'time_limit') {
        setUpgradeBanner(true)
      }
    })

    socket.on('chat_timer_warning', (data) => {
      setUpgradeBanner(true)
    })

    socket.on('request_review', () => {
      setModals(prev => ({ ...prev, review: true }))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  function toggleTheme() {
    var html = document.documentElement
    var cur = html.getAttribute('data-theme')
    var next = cur === 'dark' ? 'light' : 'dark'
    html.setAttribute('data-theme', next)
    localStorage.setItem('strangerchat-theme', next)
    document.querySelectorAll('.theme-toggle svg use').forEach(function (u) {
      u.setAttribute('href', next === 'dark' ? '#icon-sun' : '#icon-moon')
    })
  }

  const statusClass = state === 'searching' ? 'searching' : state === 'chatting' ? 'connected' : 'idle'
  const statusText = state === 'searching' ? 'Searching...' : state === 'chatting' ? 'Connected' : 'Disconnected'
  const nextBtnText = state === 'searching' ? 'Skip' : state === 'chatting' ? 'Next' : 'Find Match'
  const isInputDisabled = state !== 'chatting'
  const isReportDisabled = state !== 'chatting'

  const findMatch = () => {
    if (state === 'idle') {
      socketRef.current?.emit('find_match')
    } else if (state === 'searching') {
      socketRef.current?.emit('leave_chat')
      setState('idle')
      setMessages([])
    } else if (state === 'chatting') {
      socketRef.current?.emit('leave_chat')
      setState('idle')
      setMessages([{ text: 'You disconnected.', sender: 'system' }])
      setModals(prev => ({ ...prev, review: true }))
    }
  }

  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }

  const handleSend = () => {
    if (!inputValue.trim() || state !== 'chatting') return
    const text = inputValue.trim()
    socketRef.current?.emit('send_msg', text)
    setMessages(prev => [...prev, { text, sender: 'me', time: Date.now() }])
    setInputValue('')
    
    setTyping(false)
    socketRef.current?.emit('typing', false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    } else {
      if (state === 'chatting' && !typing) {
        setTyping(true)
        socketRef.current?.emit('typing', true)
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false)
        socketRef.current?.emit('typing', false)
      }, 2000)
    }
  }

  const openPremium = () => {
    setModals(prev => ({ ...prev, premium: true, matchLimit: false }))
  }

  const closeModal = (name) => {
    setModals(prev => ({ ...prev, [name]: false }))
  }

  const selectStar = (n) => {
    setStars(n)
  }

  const submitReview = () => {
    socketRef.current?.emit('submit_review', { rating: stars, text: reviewComment })
    setModals(prev => ({ ...prev, review: false }))
    setStars(0)
    setReviewComment('')
  }

  const closeReview = () => {
    setModals(prev => ({ ...prev, review: false }))
    setStars(0)
    setReviewComment('')
  }
  
  const reportUser = () => {
    if (state === 'chatting') {
        socketRef.current?.emit('report_user', { reason: 'Inappropriate behavior via button' })
        setMessages(prev => [...prev, { text: 'You reported the stranger.', sender: 'system' }])
    }
  }

  const activatePremium = () => {
    closeModal('premium')
  }

  const subscribeEmail = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    closeModal('email')
    setEmail('')
  }

  const closeEmail = () => {
    closeModal('email')
    setEmail('')
  }

  const hideUpgradeBanner = () => {
    setUpgradeBanner(false)
  }

  return (
    <>
      <header className="chat-header">
        <div className="chat-header-left">
          <Link to="/" className="btn btn-ghost btn-icon" aria-label="Back to home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </Link>
          <span className="chat-brand">
            <span className="chat-brand-icon">SC</span>
            StrangerChat
          </span>
          <div className={`chat-status ${statusClass}`}>
            <span className="chat-status-dot"></span>
            <span>{statusText}</span>
          </div>
        </div>
        <div className="chat-header-right">
          <span className="chat-online-count">{onlineCount} online</span>
          <button className="theme-toggle btn btn-ghost btn-icon" aria-label="Toggle theme" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><use href="#icon-moon" /></svg>
          </button>
          <button className="btn btn-ghost btn-icon" disabled={isReportDisabled} aria-label="Report user" onClick={reportUser}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </button>
          <button className="btn btn-sm btn-primary" onClick={openPremium}>Premium</button>
        </div>
      </header>

      <div className={`searching-overlay${state === 'searching' ? ' active' : ''}`}>
        <div className="searching-radar">
          <div className="searching-ring"></div>
          <div className="searching-inner">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
        </div>
        <h2>Finding your match...</h2>
        <p>Scanning global network</p>
        <button className="btn btn-ghost" onClick={findMatch}>Cancel</button>
      </div>

      <div className={`match-overlay${showMatchOverlay ? ' active' : ''}`}>
        <div className="match-content">
          <div className="match-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <div className="match-particles">
            {matchParticles.map(p => (
              <div key={p.id} className="match-particle" style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, animationDelay: `${p.delay}s`, width: p.size, height: p.size }} />
            ))}
          </div>
          <h1>Matched!</h1>
          <p>Say hello to your stranger</p>
        </div>
      </div>

      <div className="chat-container" ref={chatRef}>
        {messages.length === 0 && (
          <div className="conn-msg">
            <span>Connecting to server...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          msg.sender === 'system' ? (
            <div className="conn-msg" key={i}>
              <span>{msg.text}</span>
            </div>
          ) : (
            <div className={`message-row${msg.sender === 'me' ? ' me' : ''}`} key={i}>
              <div className={`message-bubble ${msg.sender === 'me' ? 'me' : 'stranger'}`}>
                <div className="message-sender-name">{msg.sender === 'me' ? 'You' : 'Stranger'}</div>
                <p>{msg.text}</p>
                <span className="message-time">{new Date(msg.time || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )
        ))}
      </div>

      <div className={`typing-area${partnerTyping ? ' active' : ''}`}>
        <div className="typing-indicator">
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
          <span className="typing-dot"></span>
        </div>
      </div>

      <button className={`scroll-bottom-btn${showScrollBtn ? ' visible' : ''}`} onClick={scrollToBottom} aria-label="Scroll to bottom">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>

      <div className="chat-input-area">
        <div className="chat-input-inner">
          <button className="btn btn-primary chat-next-btn" onClick={findMatch}>
            <span>{nextBtnText}</span>
          </button>
          <div className="chat-input-wrap">
            <input type="text" placeholder="Type a message..." disabled={isInputDisabled} autoComplete="off" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} />
          </div>
          <button className="btn btn-primary chat-send-btn" disabled={isInputDisabled} onClick={handleSend} aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>

      <div className={`upgrade-banner${upgradeBanner ? ' active' : ''}`}>
        <div className="upgrade-banner-inner">
          <span className="upgrade-banner-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </span>
          <div className="upgrade-banner-text">
            <strong>You've been chatting for 10 minutes!</strong>
            <span>Upgrade to Premium for unlimited chat time — only ৳150/mo</span>
          </div>
          <button className="btn btn-sm upgrade-btn" onClick={openPremium}>Upgrade</button>
          <button className="btn btn-ghost btn-icon upgrade-close-btn" onClick={hideUpgradeBanner} aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className={`modal-overlay${modals.matchLimit ? ' active' : ''}`}>
        <div className="modal">
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2>Daily Limit Reached</h2>
          <p>You've used all 50 matches for today. Upgrade now to get unlimited chats and keep talking.</p>
          <button className="btn btn-primary" onClick={openPremium}>Go Premium — 150 BDT/mo</button>
          <button className="btn btn-ghost btn-sm" onClick={() => closeModal('matchLimit')}>Maybe Later</button>
        </div>
      </div>

      <div className={`modal-overlay${modals.premium ? ' active' : ''}`}>
        <div className="modal modal-premium">
          <button className="btn btn-ghost btn-icon modal-close-btn" onClick={() => closeModal('premium')} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <h2>Go Premium</h2>
          <p>Unlock the full StrangerChat experience</p>
          <div className="premium-feature-list">
            <div className="premium-feature-row">
              <span className="premium-check">∞</span>
              Unlimited matches
            </div>
            <div className="premium-feature-row">
              <span className="premium-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </span>
              No chat time limit
            </div>
            <div className="premium-feature-row">
              <span className="premium-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              </span>
              Real-time translation
            </div>
            <div className="premium-feature-row">
              <span className="premium-check">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </span>
              Ad-free experience
            </div>
          </div>
          <button className="btn btn-primary" onClick={activatePremium}>৳150/mo — Go Premium</button>
          <p className="caption modal-disclaimer">Cancel anytime.</p>
        </div>
      </div>

      <div className={`modal-overlay${modals.review ? ' active' : ''}`}>
        <div className="modal">
          <div className="modal-icon modal-icon-star">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <h2>How was your chat?</h2>
          <p>Your review helps others. Takes 5 seconds.</p>
          <div className="star-row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`star-btn ${stars >= n ? 'active' : 'inactive'}`} onClick={() => selectStar(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
            ))}
          </div>
          <textarea className="input modal-textarea" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience (optional)..." rows="3"></textarea>
          <button className="btn btn-primary" onClick={submitReview} disabled={stars === 0}>Submit Review</button>
          <button className="btn btn-ghost btn-sm" onClick={closeReview}>Skip</button>
        </div>
      </div>

      <div className={`modal-overlay${modals.email ? ' active' : ''}`}>
        <div className="modal modal-email">
          <button className="btn btn-ghost btn-icon modal-close-btn" onClick={closeEmail} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div className="modal-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          <h2>Stay updated</h2>
          <p>Get notified about new features, improvements, and community updates.</p>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
          <button className="btn btn-primary" onClick={subscribeEmail} disabled={!email}>Subscribe</button>
          <button className="btn btn-ghost btn-sm" onClick={closeEmail}>No thanks</button>
          <p className="caption modal-disclaimer">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </>
  )
}
