import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Menu, X, LogOut, Map, Sun, Moon } from 'lucide-react';
import ProgressMapContainer from '@/components/progress-map/ProgressMapContainer_v2';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/ThemeContext';

// props:
// - items: [{ path, label }]
// - brandHref: string
// - onLogout?: () => void
// - cta?: { label: string, href?: string, onClick?: () => void }
const TopNavbar = ({ items = [], brandHref = '/', cta, onLogout, user }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  const [highlightStyle, setHighlightStyle] = useState(null);
  const [showProgressMap, setShowProgressMap] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [particles, setParticles] = useState([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState(null);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Check for openMap query parameter and auto-open progress map
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openMap') === 'true') {
      setShowProgressMap(true);
      // Clean up the URL
      const newUrl = location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location]);

  // Generate floating particles
  useEffect(() => {
    const particleCount = 15;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    }));
    setParticles(newParticles);
  }, []);

  // Track mouse position for magnetic effect
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Create ripple effect
  const createRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
  };

  useEffect(() => {
    if (!navRef.current) return;
    // Filter out AI Chat from items for accurate index calculation
    const visibleItems = items.filter(item => item.label !== 'AI Chat');
    const activeIndex = visibleItems.findIndex((item) => location.pathname === item.path);
    if (activeIndex === -1) {
      setHighlightStyle(null);
      return;
    }
    const navLinks = navRef.current.querySelectorAll('.nav-link');
    const activeLink = navLinks[activeIndex];
    if (activeLink) {
      const { offsetLeft, offsetWidth } = activeLink;
      setHighlightStyle({ 
        left: offsetLeft, 
        width: offsetWidth,
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
      });
    }
  }, [location.pathname, items]);

  const isActive = (path) => location.pathname === path;

  const renderCTA = () => {
    if (cta?.onClick) {
      return (
        <button
          onClick={cta.onClick}
          className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95 overflow-hidden"
        >
          <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative">{cta.label}</span>
        </button>
      );
    }
    if (cta?.href) {
      return (
        <Link
          to={cta.href}
          className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 active:scale-95 overflow-hidden"
        >
          <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative">{cta.label}</span>
        </Link>
      );
    }
    if (onLogout) {
      return (
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="group relative inline-flex items-center justify-center rounded-full bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-slate-500/30 hover:scale-105 active:scale-95 overflow-hidden"
        >
          <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="relative">Logout</span>
        </button>
      );
    }
    return null;
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-12px) translateX(3px); }
        }
        @keyframes particle-float {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 0.6; }
        }
        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 0.5; }
          100% { width: 300px; height: 300px; opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(20, 184, 166, 0.3); }
          50% { box-shadow: 0 0 20px rgba(20, 184, 166, 0.6); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .floating-icon {
          animation: float 6s ease-in-out infinite;
        }
        .particle {
          animation: particle-float var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .ripple-effect {
          animation: ripple 0.6s ease-out;
        }
        .nav-link-hover {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .nav-link-hover:hover {
          transform: translateY(-2px) scale(1.05);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        .glass-reflection::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 100%);
          border-radius: inherit;
          pointer-events: none;
        }
      `}</style>
      <div className="sticky top-0 z-40 w-full px-4 pt-4">
        <div className="mx-auto max-w-6xl">
          <div 
            className="relative flex h-16 items-center justify-between rounded-3xl border border-emerald-300/40 px-4 glass-effect glass-reflection overflow-hidden"
            style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 0 1px rgba(148, 163, 184, 0.1)'
            }}
            onMouseMove={handleMouseMove}
            onClick={createRipple}
          >
            {/* Floating Particles Background */}
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="particle absolute rounded-full bg-gradient-to-br from-teal-400/40 to-cyan-400/40 pointer-events-none blur-sm"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  '--duration': `${particle.duration}s`,
                  '--delay': `${particle.delay}s`,
                }}
              />
            ))}
            
            {/* Ripple Effects */}
            {ripples.map((ripple) => (
              <div
                key={ripple.id}
                className="ripple-effect absolute rounded-full border-2 border-teal-400/50 pointer-events-none"
                style={{
                  left: ripple.x,
                  top: ripple.y,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
            
            {/* Left: Hamburger Menu (Mobile) + Brand */}
            <div className="flex items-center gap-3 relative z-10">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 rounded-xl transition-all duration-300 hover:bg-teal-50 hover:scale-110 active:scale-95"
                onClick={() => setIsOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
              {/* Brand */}
              <Link to={brandHref} className="group flex items-center gap-3 px-2">
                <div className="relative">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-teal-500/60 group-hover:scale-110">
                    <Zap className="h-5 w-5" />
                  </span>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-400 blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                </div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent transition-all duration-300 group-hover:from-teal-600 group-hover:to-cyan-600" style={{ fontFamily: 'Space Grotesk' }}>
                  Rehabit
                </span>
              </Link>
            </div>

            {/* Center: Nav links (Desktop only) */}
            <nav ref={navRef} className="hidden md:flex items-center gap-1 text-sm relative z-10">
              {highlightStyle && (
                <span
                  className="absolute top-0 h-full bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-emerald-500/30"
                  style={{ 
                    left: highlightStyle.left, 
                    width: highlightStyle.width, 
                    zIndex: 0,
                    transition: highlightStyle.transition,
                    boxShadow: '0 0 20px rgba(20, 184, 166, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                  }}
                />
              )}
              {items.map((item, index) => {
                // Remove AI Chat from desktop nav; will be accessed via floating button
                if (item.label === 'AI Chat') return null;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link nav-link-hover relative rounded-xl px-4 py-2.5 font-medium transition-all duration-300 ${
                      isActive(item.path) 
                        ? 'text-teal-600' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ zIndex: 1 }}
                    onMouseEnter={() => setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {item.label}
                    </span>
                    {hoveredItem === index && !isActive(item.path) && (
                      <span className="absolute inset-0 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl opacity-50" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Theme Toggle + CTA (Desktop only) */}
            <div className="hidden md:flex items-center gap-2 pl-2 relative z-10">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/60 hover:bg-slate-50 text-slate-600 transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
              </button>
              {renderCTA()}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div className="absolute left-0 top-0 h-full w-[300px] sm:w-[340px] glass-effect shadow-2xl flex flex-col transform transition-transform duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40">
                  <Zap className="h-5 w-5" />
                </span>
                <span
                  className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent"
                  style={{ fontFamily: 'Space Grotesk' }}
                >
                  Rehabit
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
            <nav className="p-4 flex flex-col gap-2 overflow-y-auto">
              {/* Progress Map quick access (mobile only) */}
              <button
                onClick={() => {
                  setShowProgressMap(true);
                  setIsOpen(false);
                }}
                aria-label="Open progress map"
                className="group relative rounded-xl px-5 py-4 text-sm font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
                  boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)'
                }}
              >
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative inline-flex items-center gap-2">
                  <Map className="h-5 w-5" /> 
                  Progress Map
                </span>
              </button>
              {items.map((item) => {
                // Remove AI Chat from mobile drawer; will be accessed via floating button
                if (item.label === 'AI Chat') return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`group relative rounded-xl px-5 py-4 text-sm font-medium transition-all duration-300 flex items-center gap-3 overflow-hidden hover:scale-105 active:scale-95 ${
                      isActive(item.path) 
                        ? 'text-teal-600 bg-gradient-to-r from-teal-50 to-cyan-50 shadow-lg shadow-teal-500/20' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    style={{ zIndex: 1 }}
                  >
                    {Icon ? <Icon className="h-5 w-5 flex-shrink-0 relative z-10" /> : null}
                    <span className="relative z-10">{item.label}</span>
                    {isActive(item.path) && (
                      <span className="ml-auto inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    )}
                  </Link>
                );
              })}
              {onLogout && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="group relative mt-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4 text-sm font-semibold text-white transition-all duration-300 hover:shadow-xl hover:shadow-red-500/30 flex items-center justify-center gap-2 overflow-hidden hover:scale-105 active:scale-95"
                >
                  <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <LogOut className="h-5 w-5 relative z-10" />
                  <span className="relative z-10">Logout</span>
                </button>
              )}
              {(cta?.onClick || cta?.href) && (
                <div className="mt-2">{renderCTA()}</div>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Progress Map Overlay */}
      {showProgressMap && (
        <div
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowProgressMap(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              margin: '12px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
            }}
          >
            <ProgressMapContainer 
              onClose={() => setShowProgressMap(false)} 
              onNavigate={() => {
                setShowProgressMap(false);
                setIsOpen(false);
              }}
              user={user} 
              currentUserId={user?._id}
            />
          </div>
        </div>
      )}    

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[260px] sm:max-w-sm mx-auto p-4 sm:p-8 flex flex-col items-center gap-2 sm:gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-red-50 flex items-center justify-center mb-0.5 sm:mb-1">
              <LogOut className="w-5 h-5 sm:w-7 sm:h-7 text-red-500" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-800">Sign out?</h2>
            <p className="text-slate-500 text-xs sm:text-sm text-center">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-2 sm:gap-3 w-full mt-1 sm:mt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowLogoutConfirm(false); onLogout(); }}
                className="flex-1 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-red-500/30 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopNavbar;
