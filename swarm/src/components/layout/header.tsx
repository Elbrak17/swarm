'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletButton } from '@/components/wallet';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { useDemoStore } from '@/store/demo-store';
import { 
  Menu, 
  X, 
  Store, 
  LayoutDashboard, 
  Plus,
  Briefcase,
  Users,
  Eye,
  Sparkles
} from 'lucide-react';

/**
 * Navigation links configuration with icons
 */
const navLinks = [
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const quickActions = [
  { href: '/job/new', label: 'Poster un Job', icon: Briefcase, color: 'text-blue-500' },
  { href: '/swarm/new', label: 'Créer un Swarm', icon: Users, color: 'text-purple-500' },
];

/**
 * Premium Header component
 * Mobile-first with smooth animations
 */
export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { isDemoMode } = useDemoStore();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isScrolled && "shadow-sm"
      )}>
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2 group" 
              onClick={closeMobileMenu}
            >
              <div className="relative">
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  SWARM
                </span>
                {isDemoMode && (
                  <div className="absolute -top-1 -right-3">
                    <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                  </div>
                )}
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <WalletButton />
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <WalletButton />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <div className="relative w-5 h-5">
                <Menu className={cn(
                  "absolute inset-0 transition-all duration-200",
                  isMobileMenuOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
                )} />
                <X className={cn(
                  "absolute inset-0 transition-all duration-200",
                  isMobileMenuOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
                )} />
              </div>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 z-40 md:hidden transition-all duration-300",
        isMobileMenuOpen 
          ? "opacity-100 pointer-events-auto" 
          : "opacity-0 pointer-events-none"
      )}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
        
        {/* Menu Panel */}
        <div className={cn(
          "absolute top-14 left-0 right-0 bg-background border-b shadow-xl",
          "transition-all duration-300 ease-out",
          isMobileMenuOpen 
            ? "translate-y-0 opacity-100" 
            : "-translate-y-4 opacity-0"
        )}>
          <nav className="container px-3 py-4 space-y-1">
            {/* Demo Mode Indicator */}
            {isDemoMode && (
              <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Eye className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Mode Démo Actif
                </span>
                <Sparkles className="w-3 h-3 text-amber-400 ml-auto animate-pulse" />
              </div>
            )}

            {/* Main Navigation */}
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all active:scale-98",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="my-3 border-t" />

            {/* Quick Actions */}
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions Rapides
            </p>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-foreground hover:bg-muted transition-all active:scale-98"
                >
                  <div className={cn("p-1.5 rounded-md bg-muted", action.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                  <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
                </Link>
              );
            })}

            {/* Divider */}
            <div className="my-3 border-t" />

            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm text-muted-foreground">Thème</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
