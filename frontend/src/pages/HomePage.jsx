import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, GraduationCap, Bot, ArrowRight, WandSparkles, Navigation, LayoutDashboard, Sparkles } from 'lucide-react';
import useAppStore from '../stores/useAppStore';

const InteractiveFeatureCard = ({ feature, index }) => {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({});

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update CSS variables for the glowing border pseudo-element
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);

    // Calculate 3D tilt
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Max rotation 4 degrees
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px) scale(1.01)`,
      borderColor: `${feature.color}40`,
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)',
      borderColor: 'rgba(255,255,255,0.8)',
    });
    
    // Reset internal elements via querySelector to avoid React state lag on children
    if (cardRef.current) {
      const iconWrapper = cardRef.current.querySelector('.feature-icon-wrapper');
      const ctaIcon = cardRef.current.querySelector('.feature-cta-icon');
      const ctaText = cardRef.current.querySelector('.feature-cta-text');
      
      if (iconWrapper) {
        iconWrapper.style.transform = 'scale(1) rotate(0deg)';
        iconWrapper.style.boxShadow = `0 8px 16px -4px ${feature.color}30`;
      }
      if (ctaIcon) ctaIcon.style.transform = 'translateX(0)';
      if (ctaText) ctaText.style.textDecoration = 'none';
    }
  };

  const handleMouseEnter = () => {
    if (cardRef.current) {
      const iconWrapper = cardRef.current.querySelector('.feature-icon-wrapper');
      const ctaIcon = cardRef.current.querySelector('.feature-cta-icon');
      const ctaText = cardRef.current.querySelector('.feature-cta-text');
      
      if (iconWrapper) {
        iconWrapper.style.transform = 'scale(1.1) rotate(-3deg)';
        iconWrapper.style.boxShadow = `0 12px 24px -6px ${feature.color}60`;
      }
      if (ctaIcon) ctaIcon.style.transform = 'translateX(6px)';
      if (ctaText) ctaText.style.textDecoration = 'underline';
    }
  };

  return (
    <Link 
      to={feature.path}
      className="interactive-card animate-slide-up"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{
        ...style,
        padding: 'var(--space-6)',
        animationDelay: `${0.7 + (index * 0.15)}s`,
        border: '1px solid rgba(255,255,255,0.8)',
      }}
    >
      <div 
        className="feature-icon-wrapper"
        style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '20px', 
          background: feature.bg, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 'var(--space-5)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 8px 16px -4px ${feature.color}30`
        }}>
        <feature.icon size={32} color={feature.color} strokeWidth={2.2} />
      </div>
      
      <h4 className="text-xl" style={{ margin: '0 0 var(--space-2) 0', color: 'var(--color-foreground)', fontWeight: 700 }}>
        {feature.title}
      </h4>
      <p className="text-base text-muted" style={{ margin: '0 0 var(--space-6) 0', flex: 1, lineHeight: 1.6 }}>
        {feature.description}
      </p>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        color: feature.color, 
        fontWeight: 600, 
        fontSize: '15px', 
        gap: '8px',
        marginTop: 'auto'
      }}>
        <span className="feature-cta-text" style={{ transition: 'all 0.3s ease' }}>Khám phá ngay</span>
        <feature.ctaIcon className="feature-cta-icon" size={18} style={{ transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
      </div>
    </Link>
  );
};

const HomePage = () => {
  const { user } = useAppStore();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Cóc';
  const containerRef = useRef(null);

  // Spotlight effect tracking mouse position
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (containerRef.current) {
        containerRef.current.style.setProperty('--spotlight-x', `${e.clientX}px`);
        containerRef.current.style.setProperty('--spotlight-y', `${e.clientY}px`);
      }
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const features = [
    {
      title: 'Bản đồ số',
      description: 'Tra cứu phòng học, tìm đường đi và khám phá các tiện ích trong khuôn viên trường.',
      icon: MapPinned,
      ctaIcon: Navigation,
      path: '/map',
      color: 'var(--color-primary)',
      bg: 'linear-gradient(135deg, #FFF0E6 0%, #FFE4D6 100%)'
    },
    {
      title: 'Học vụ',
      description: 'Cẩm nang hướng dẫn sử dụng các hệ thống FAP, FLM, CMS, Edunext cho sinh viên.',
      icon: GraduationCap,
      ctaIcon: ArrowRight,
      path: '/portal',
      color: '#10B981',
      bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
    },
    {
      title: 'Cóc AI',
      description: 'Trợ lý ảo thông minh giải đáp mọi thắc mắc về quy định, thủ tục và học tập.',
      icon: Bot,
      ctaIcon: Sparkles,
      path: '/chat',
      color: '#3B82F6',
      bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)'
    }
  ];

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100%', 
        overflowY: 'auto', 
        backgroundColor: 'var(--color-background)', 
        position: 'relative',
        // Interactive spotlight on a subtle dot grid
        backgroundImage: `
          radial-gradient(
            800px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%),
            rgba(242, 109, 33, 0.04),
            transparent 40%
          ),
          radial-gradient(circle, var(--color-border) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 24px 24px',
        backgroundPosition: '0 0, 0 0',
      }}
    >
      {/* Hero Section */}
      <div style={{ 
        position: 'relative',
        zIndex: 10,
        padding: 'calc(var(--space-8) * 2) var(--space-4) var(--space-8)', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center', 
        minHeight: '60vh',
      }}>
        {/* Animated Badge */}
        <div className="animate-slide-up" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: '0 4px 12px rgba(242, 109, 33, 0.08)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-foreground)'
        }}>
          <WandSparkles size={16} className="text-primary" />
          <span>Chào mừng, {userName}! 👋</span>
        </div>

        {/* Hero Title */}
        <h1 className="animate-slide-up" style={{ 
          margin: '0 0 var(--space-4) 0',
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.04em',
          animationDelay: '0.15s'
        }}>
          <span style={{ display: 'block', color: 'var(--color-foreground)', fontSize: '0.45em', marginBottom: '12px', fontWeight: 700, opacity: 0.9 }}>Chào mừng đến với</span>
          <span className="text-gradient-hero" style={{ display: 'block', paddingBottom: '4px' }}>
            FPTU STUDENT GUIDE
          </span>
        </h1>

        <p className="animate-slide-up" style={{ 
          margin: '0 0 var(--space-8) 0', 
          maxWidth: '600px', 
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--color-muted-foreground)',
          lineHeight: 1.6,
          animationDelay: '0.3s'
        }}>
          Cẩm nang số thông minh dành cho sinh viên FPTU. Khám phá khuôn viên trường, tra cứu học vụ và giải đáp thắc mắc cùng trợ lý AI.
        </p>

        {/* Hero Buttons */}
        <div className="animate-slide-up" style={{ animationDelay: '0.45s', display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/map" className="btn btn-primary" style={{ 
            padding: '16px 32px', 
            borderRadius: 'var(--radius-pill)', 
            fontSize: '1.1rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 12px 24px -8px rgba(242, 109, 33, 0.5)';
            e.currentTarget.querySelector('.btn-icon').style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(242, 109, 33, 0.25)';
            e.currentTarget.querySelector('.btn-icon').style.transform = 'translateX(0)';
          }}>
            Khám phá ngay <ArrowRight className="btn-icon" size={20} style={{ marginLeft: '8px', transition: 'transform 0.3s' }} />
          </Link>

          <Link to="/portal" className="btn btn-outline" style={{ 
            padding: '16px 32px', 
            borderRadius: 'var(--radius-pill)', 
            fontSize: '1.1rem', 
            backgroundColor: 'rgba(255, 255, 255, 0.6)', 
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(242, 109, 33, 0.4)';
            e.currentTarget.style.color = 'var(--color-primary)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-foreground)';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <LayoutDashboard size={18} style={{ marginRight: '8px' }} /> Xem tính năng
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="container" style={{ 
        position: 'relative',
        zIndex: 10,
        padding: '0 var(--space-4) var(--space-8)', 
        maxWidth: '1200px' 
      }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h3 className="text-2xl animate-slide-up" style={{ fontWeight: 700, color: 'var(--color-foreground)', animationDelay: '0.55s' }}>
            Truy cập nhanh
            <div style={{ height: '3px', width: '40px', background: 'var(--color-primary)', margin: '8px auto 0', borderRadius: '4px', opacity: 0.5 }} />
          </h3>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 'var(--space-6)' 
        }}>
          {features.map((feature, index) => (
            <InteractiveFeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
