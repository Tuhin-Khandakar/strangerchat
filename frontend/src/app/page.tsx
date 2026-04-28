'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <img 
              alt="StrangerChat Logo" 
              className="h-8 w-auto" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuARgtZJ2m0XHgsovZLFG5mSSZgvdanIrmFaFTNBGQYeZsCpzZPGkfamxQRvouUhStsZK1Ebc7v29Of5OorTc9LbteGrTyNW5Gf5osyysEdDUDLu07LkNS8W9crezyGH2qU340k--tauD0zDQYe14M1Hfm5IW4IxLhMzH5gccV1o3EywRbfQM-9_ly3x54_34dwuIxTAHMVLp_5B7CVKGOVYgqDxy0qrAPuO8MAOwrwnFrggaSqjQh_Z06q33Iln3wuBSPmHzEUlCgk"
            />
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">StrangerChat</span>
          </div>
          <div className="hidden md:flex items-center gap-10">
            <a className="text-slate-600 hover:text-indigo-500 transition-colors duration-200 font-medium" href="#features">Features</a>
            <a className="text-slate-600 hover:text-indigo-500 transition-colors duration-200 font-medium" href="#safety">Safety</a>
            <a className="text-slate-600 hover:text-indigo-500 transition-colors duration-200 font-medium" href="#pricing">Pricing</a>
          </div>
          <div className="flex items-center">
            <Link href="/chat">
                <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 active:scale-95 transition-all">
                  Start Chatting
                </button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative px-8 pt-20 pb-32 max-w-7xl mx-auto overflow-visible">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold uppercase tracking-widest mb-6">
                <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                1M+ Active Now
              </div>
              <h1 className="text-6xl md:text-7xl font-extrabold text-on-surface tracking-tight leading-[1.05] mb-8">
                Connect with <span className="text-primary">Strangers</span> Instantly.
              </h1>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-10 max-w-xl">
                Experience the world's most sophisticated random chat platform. Meet interesting people globally with elite AI-powered moderation and crystal-clear video.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/chat">
                    <button className="primary-gradient text-on-primary px-10 py-5 rounded-full font-bold text-lg ambient-shadow hover:opacity-90 transition-opacity">
                      Start Chatting Free
                    </button>
                </Link>
                <Link href="#features">
                    <button className="bg-surface-container-highest text-primary px-10 py-5 rounded-full font-bold text-lg hover:bg-surface-container-high transition-colors">
                      Explore Community
                    </button>
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-3">
                  <img alt="User" className="h-10 w-10 rounded-full border-2 border-surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBhEnA-ILw1RKwUuPTFjOwWF1naHotGuv2P1yDHyzqRnTSASUs2UElEB0JscUyfABRSdXzI2dbtqZU918-F_hKHOIJWgWkOjsR9WsJTnFCMKF-pVV6nVyEkx1nMkXPbHmNt-3f73lwFqa4LAhmjIvYA7HqXqU6QWNV9VrseGTyJpvEk3d-P1iI3zdorOGZByNTl5xfVAhFmSkLsVR-9uX5pKBZJw7CnX-6fsXUfq7YmWDwLNa6eXv6zS6hRaDKjegmG8z0WqfwKdg"/>
                  <img alt="User" className="h-10 w-10 rounded-full border-2 border-surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6wJFd2Ne-BHASgj4amt08mc_dERHDHMlWZJNIBqFfjxu-SuotiCjKr1YHYlWVmotU2nd2qnaZQRPiK9CX7ffH-Bosued5VJlQkor6ZoEoYSQWoKAnqdFef_eRCROE2pRR9vErlxZphRWGxNKzI6r85WH5j4AuVppQFMHmpynhbgs-HcVUsNetapoWsSR2AhcMoVUa-X6KXa8RRRMAkkUpAKdlT8G1yN8820W-_gZt_TloeSQnCxGzktxd_Yx2VPGHqbn0Ys09QpI"/>
                  <img alt="User" className="h-10 w-10 rounded-full border-2 border-surface" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgfn319AnquSKiG2gdchRpwxKJfk2oi4C1Xxod1-Y8CPoHPnTGgdQ5XmXm7-HLXW9Kees_WX_ZN8s5Z0X8tFzIm-pUdToyH6wZg9b9s59czETddXp6i2JbZjbhTKfKw3oICTzGkyobNGezygdjTE745oxF34AiGnZkRgKBu8tf6gh4wuibZKK0xBww2jQvLQdl9bkOY5XSA00AVLy_XoyVxrYO04Eyc3WMYe6UC0jQfkpr_bbKvioT-BKlhbcS6C0pnWkwZD3u4Wo"/>
                </div>
                <p className="text-sm font-medium text-on-surface-variant">Joined by <span className="text-on-surface font-bold">12,400+</span> people today</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl -z-10"></div>
              <div className="bg-surface-container-lowest p-4 rounded-[2rem] ambient-shadow ghost-border relative overflow-hidden">
                <img alt="Platform Preview" className="rounded-[1.5rem] w-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDs2jzZ3mRUvKZ_pBgqnP4l-jf-Ahl8lvOW9YNifpe9DkhCrnk0QES75xycx_DUBrpYrfoFoOFJkKmAkxp6vbU0Ma0BW_u9LzGtPgAW5c6kA4OfxgheTm364xpqvRCfNcXEkvD9VBVpVTXvLI6-B53FG9pskMcIk-y25KBR-nq6yupJhBINll6Jazw_Ax8fU3gacgC34UwQDU1Fm3n39ldh1nzzZyM53aZDc1zl8DOptX6DgFwpscLuz3_TwjKIIGr7TlXzM-TCB_w"/>
                <div className="absolute bottom-10 left-10 right-10 bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/40">
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-800">New match found from Tokyo, Japan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-32 bg-surface-container-low px-8" id="features">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface mb-4">Engineered for Connection</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed">
                Modern technology meets human interaction. We've built the fastest and safest way to talk to anyone in the world.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 bg-surface-container-lowest p-10 rounded-[2rem] ambient-shadow ghost-border flex flex-col justify-between group overflow-hidden">
                <div>
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                    <span className="material-symbols-outlined text-3xl">speed</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4">2-Second Matching</h3>
                  <p className="text-on-surface-variant text-lg max-w-md">Our global low-latency network ensures you're never more than two seconds away from your next great conversation.</p>
                </div>
                <div className="mt-8 transform transition-transform group-hover:translate-x-2">
                  <img alt="Speed" className="h-40 w-full object-cover rounded-2xl opacity-20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAbAFyu7KhlLXWr_CvL2t7e9ozmUfhBCywVXG0Ngb-y9_tDyYX65SsnkY4frQc_LwAgSdObtK7ifhpzApI6ycjOUBUfB6krGDEHP8mEY-JHRk0fnvWPQhpRuBwMTNqJQY23kFeFFt5O-sD76jDoBbJTSaGmKtLxIqQjtNiduLTPPFNzzXCzD6e80ZxvkVJRw4Iih8ER1ttDU2FLV-ngSlsQ4tGNcEx9WDX0hREuhKKnAfaJxy19pyd1UgGgLAkeW_wngwlz6CoaQw"/>
                </div>
              </div>
              
              <div className="md:col-span-4 bg-primary p-10 rounded-[2rem] ambient-shadow flex flex-col justify-between text-on-primary">
                <div>
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>security</span>
                  </div>
                  <h3 className="text-3xl font-bold mb-4">AI Moderation</h3>
                  <p className="text-white/80 text-lg">Real-time smart monitoring keeps our community friendly, professional, and safe for everyone.</p>
                </div>
              </div>
              
              <div className="md:col-span-4 bg-surface-container-lowest p-10 rounded-[2rem] ambient-shadow ghost-border">
                <div className="h-12 w-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-6 text-secondary">
                  <span className="material-symbols-outlined text-3xl">videocam</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Video + Text Chat</h3>
                <p className="text-on-surface-variant">Switch seamlessly between crystal-clear 4K video and instant text messaging.</p>
              </div>
              
              <div className="md:col-span-8 bg-surface-container-lowest p-10 rounded-[2rem] ambient-shadow ghost-border flex items-center gap-10">
                <div className="flex-1">
                  <div className="h-12 w-12 bg-tertiary/10 rounded-xl flex items-center justify-center mb-6 text-tertiary">
                    <span className="material-symbols-outlined text-3xl">language</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4">50+ Languages</h3>
                  <p className="text-on-surface-variant">Break barriers with real-time translation and filters for native speakers across the globe.</p>
                </div>
                <div className="hidden lg:block w-1/3">
                  <div className="grid grid-cols-3 gap-2 opacity-40">
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">FR</div>
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">JP</div>
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">ES</div>
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">KR</div>
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">DE</div>
                    <div className="p-2 bg-surface-container rounded-lg text-center font-bold">IT</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Safety Section */}
        <section className="py-32 px-8 bg-surface" id="safety">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-bold mb-8">
              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
              Enterprise-Grade Privacy
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-16 tracking-tight">Your Safety is Our Foundation</h2>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="flex gap-6 text-left">
                <div className="flex-shrink-0 h-16 w-16 bg-white rounded-2xl ambient-shadow flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">lock</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">E2E Encryption</h4>
                  <p className="text-on-surface-variant leading-relaxed">All video and text streams are encrypted end-to-end. We cannot see or hear your private conversations.</p>
                </div>
              </div>
              <div className="flex gap-6 text-left">
                <div className="flex-shrink-0 h-16 w-16 bg-white rounded-2xl ambient-shadow flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-4xl">psychology</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-2">AI-Driven Protection</h4>
                  <p className="text-on-surface-variant leading-relaxed">Our advanced neural networks detect and block inappropriate behavior before you ever encounter it.</p>
                </div>
              </div>
            </div>
            <div className="mt-20 p-8 bg-surface-container-low rounded-[2rem] flex flex-wrap justify-center gap-12 items-center opacity-60 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-2 text-xl font-black italic tracking-tighter">TRUSTEE</div>
              <div className="flex items-center gap-2 text-xl font-bold">PrivacyShield</div>
              <div className="flex items-center gap-2 text-xl font-serif">GDPR Compliant</div>
              <div className="flex items-center gap-2 text-xl font-medium uppercase tracking-[0.2em]">SafeNet</div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-32 bg-white px-8" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-on-surface-variant text-lg">Choose the plan that fits your social discovery journey.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="p-10 rounded-[2.5rem] bg-surface ghost-border flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-extrabold">$0</span>
                    <span className="text-on-surface-variant font-medium">/forever</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <span>Unlimited Text Chat</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <span>Standard Video Quality</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-green-600">check_circle</span>
                      <span>Global Matching</span>
                    </li>
                  </ul>
                </div>
                <Link href="/chat" className="w-full">
                    <button className="w-full py-4 rounded-full border-2 border-outline-variant font-bold hover:bg-surface-container-high transition-colors">
                      Start Basic Chat
                    </button>
                </Link>
              </div>

              {/* Premium Plan */}
              <div className="p-10 rounded-[2.5rem] bg-primary text-on-primary ambient-shadow flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  <span className="bg-white/20 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Most Popular</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Premium</h3>
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-extrabold">$4.99</span>
                    <span className="text-on-primary-container font-medium opacity-80">/month</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined">verified</span>
                      <span>Verified Profile Badge</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined">hd</span>
                      <span>Ultra-HD Video Quality</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined">map</span>
                      <span>Filter by Gender & Region</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined">block</span>
                      <span>Ad-Free Experience</span>
                    </li>
                  </ul>
                </div>
                <Link href="/chat?premium=trigger" className="w-full">
                    <button className="w-full py-4 rounded-full bg-white text-primary font-bold hover:opacity-90 transition-opacity">
                      Get Premium Now
                    </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-24 px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto bg-on-surface rounded-[3rem] p-16 text-center text-white relative">
            <div className="absolute inset-0 primary-gradient opacity-10"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to find your <br/>next conversation?</h2>
              <p className="text-xl text-white/60 mb-12 max-w-xl mx-auto leading-relaxed">Join millions of users worldwide and experience the future of digital connection today.</p>
              <Link href="/chat">
                  <button className="bg-white text-on-surface px-12 py-5 rounded-full font-bold text-lg hover:scale-105 transition-transform">
                    Connect Instantly
                  </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img alt="StrangerChat Logo" className="h-6 w-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAob6-d-yR0TTeaOS7BKkWWdfb0kV3Bz7OiJkWBA3NrRY5fsOe-htLLhWyhp7dZcbBbS0vNYfti7ZeNHJYfg2VDl5A07iOVCTtbd8xk2CzPfP8qrFlQk5D4qzDb78-Lrlyw14PLPPG77yp1vF8xNQHCTdJf-rvwq7oZqGZMpeO1AAcAlAjFptugoWQuWhq7lAZwPthxcxjcZX4jhSdAbbvObuYr7sydMIrDNxwzHP3rpVPm_Ur7JZz6_-MUDR0dx2AZWkoeLO5leg8"/>
                <span className="text-xl font-bold text-slate-900">StrangerChat</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">Redefining global interaction through high-fidelity technology and safe, moderate environments.</p>
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-primary hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">language</span>
                </div>
                <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-primary hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">public</span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-on-surface">Product</h5>
              <ul className="space-y-4">
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/features">Features</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/pricing">Pricing</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/safety">Community Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-on-surface">Company</h5>
              <ul className="space-y-4">
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/">About Us</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/chat">Support</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6 text-on-surface">Legal</h5>
              <ul className="space-y-4">
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/terms">Terms of Service</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/privacy">Privacy Policy</Link></li>
                <li><Link className="text-slate-500 hover:text-indigo-600 transition-colors text-sm" href="/safety">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-slate-400 text-xs">© 2026 StrangerChat. All rights reserved.</span>
            <div className="flex gap-6">
              <span className="text-xs font-medium text-slate-400">System Status: <span className="text-green-600">Optimal</span></span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
