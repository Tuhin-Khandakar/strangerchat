export default function useFaqAccordion() {
  const handleClick = (e) => {
    const trigger = e.currentTarget
    const item = trigger.closest('.faq-item')
    if (!item) return
    const wasOpen = item.classList.contains('open')
    document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'))
    if (!wasOpen) item.classList.add('open')
  }
  return handleClick
}
