import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  Facebook, Youtube, MessageCircle, ChevronRight, ChevronLeft, 
  BookOpen, Users, Award, Briefcase, Globe, GraduationCap, ArrowRight, Loader2, Search, 
  Phone, Mail // 🔴 මෙන්න මේ දෙක එකතු කරන්න 🔴
} from 'lucide-react';
const heroImages = [
  '/hero1.jpg', 
  '/hero2.jpg', 
  '/hero3.jpg', 
];

export default function IMACampusLandingPage({ loggedInUser }) {
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  
  // Backend Data States
  const [businesses, setBusinesses] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL'); // 🔴 මේක අනිවාර්යයෙන් තියෙන්න ඕනේ
  const [loading, setLoading] = useState(true);

  // Auto Slide & Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    const slideTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(slideTimer);
    };
  }, []);

  // Fetch Businesses & Batches from Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/public/landing-data');
        setBusinesses(res.data?.businesses || []);
      } catch (error) {
        console.error("Failed to fetch landing data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const nextHeroSlide = () => setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
  const prevHeroSlide = () => setCurrentHeroIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);

  // 🔴 Filter Batches based on Selected Category (Business) 🔴
  let displayedBatches = [];
  if (activeCategory === 'ALL') {
      businesses.forEach(b => { displayedBatches = [...displayedBatches, ...b.batches]; });
  } else {
      const selectedBiz = businesses.find(b => b.id === activeCategory);
      if (selectedBiz) displayedBatches = selectedBiz.batches;
  }

  return (
    <div className="bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      
      {/* --- Header (Nav Bar) --- */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'top-0 bg-slate-950/95 backdrop-blur-md shadow-xl py-3' : 'top-0 bg-slate-900 py-4'}`}>
        <nav className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="IMA Logo" className="h-15 md:h-15 object-contain group-hover:scale-105 transition-transform" />
            <div className="hidden sm:block leading-none">
              <span className="text-2xl md:text-3xl font-black text-red-500 tracking-tight">IMA </span>
              <span className="text-xl md:text-2xl font-bold text-white">Campus</span>
            </div>
          </Link>

          {/* Nav Links */}
          <ul className="hidden xl:flex items-center gap-8 font-bold text-sm text-slate-300">
            {['Home', 'Programs', 'About Us', 'Contact'].map(link => (
              <li key={link}><a href={`#${link.toLowerCase().replace(' ', '-')}`} className="hover:text-white transition-colors">{link}</a></li>
            ))}
          </ul>

          {/* Right Side: Socials, Search & Buttons */}
          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Social Icons */}
            <div className="hidden lg:flex items-center gap-3 pr-4 border-r border-slate-700">
              <a href="#" className="text-slate-400 hover:text-[#1877F2] transition"><Facebook size={18}/></a>
              <a href="#" className="text-slate-400 hover:text-[#FF0000] transition"><Youtube size={18}/></a>
              <a href="#" className="text-slate-400 hover:text-[#25D366] transition"><MessageCircle size={18}/></a>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-full px-4 py-2 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500 transition-all">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent outline-none text-sm text-white ml-2 placeholder:text-slate-500 w-28 lg:w-40" 
              />
            </div>

            {/* 🔴 Login & Register Buttons (Always Visible) 🔴 */}
            <div className="flex items-center gap-3">
              <Link to="/login" className="px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 border border-slate-700 transition shadow-lg">
                Login
              </Link>
              <Link to="/register" className="px-6 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition shadow-lg shadow-red-600/30">
                Register
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* --- Hero Section --- */}
      <section className="relative h-[85vh] lg:h-[95vh] w-full overflow-hidden bg-slate-900" id="home">
        {heroImages.map((image, index) => (
          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentHeroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-transparent z-10"></div>
            <img src={image} alt={`Hero slide ${index + 1}`} className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-[10000ms]" style={{ transform: index === currentHeroIndex ? 'scale(1)' : 'scale(1.05)' }} />
            
            <div className="absolute inset-0 z-20 flex flex-col justify-center items-start max-w-screen-2xl mx-auto px-6 lg:px-10 pt-20">
              <span className="bg-red-600/20 border border-red-500/50 text-red-100 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm animate-fade-in-down">
                The New Universe of Education
              </span>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 drop-shadow-2xl max-w-4xl" style={{ fontFamily: "'Noto Sans Sinhala', sans-serif" }}>
                IMA CAMPUS වෙත <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">සාදරයෙන් පිළිගනිමු!</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl font-medium leading-relaxed drop-shadow-md">
                Shape Your Future with Excellence & Innovation in Sri Lanka's Premier Learning Environment. Join thousands of successful students today.
              </p>
              
              <Link to="/register" className="px-8 py-4 bg-red-600 text-white text-lg font-black rounded-2xl hover:bg-red-500 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 group">
                Explore Programs <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
            </div>
          </div>
        ))}
        
        <div className="absolute bottom-16 lg:bottom-12 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {heroImages.map((_, index) => (
            <button key={index} onClick={() => setCurrentHeroIndex(index)} className={`h-2 rounded-full transition-all duration-300 ${index === currentHeroIndex ? 'w-10 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'w-2 bg-white/40 hover:bg-white/60'}`}></button>
          ))}
        </div>
      </section>

      {/* --- Floating Feature Cards --- */}
      <section className="relative z-30 -mt-16 lg:-mt-24 px-6 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon={<BookOpen size={32}/>} title="Flexi-Learning Paths" desc="Learn at your own pace with hybrid classes." />
          <FeatureCard icon={<Users size={32}/>} title="Expert Instructors" desc="Island's top ranking lecturers and professionals." />
          <FeatureCard icon={<Briefcase size={32}/>} title="Career Support" desc="Guiding you towards professional success." />
          <FeatureCard icon={<Award size={32}/>} title="Certified Curriculum" desc="Globally recognized syllabus and materials." />
        </div>
      </section>

      {/* 🔴 PROGRAMS / CATEGORIES SECTION 🔴 */}
      <section className="bg-slate-50 py-24 px-6" id="programs">
        <div className="max-w-screen-2xl mx-auto">
          
          {/* 🔴 Category Tabs (Pills) 🔴 */}
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <button 
              onClick={() => setActiveCategory('ALL')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${activeCategory === 'ALL' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${activeCategory === 'ALL' ? 'bg-white' : 'bg-slate-300'}`}></div>
              Show All
            </button>
            
            {businesses.map(biz => (
              <button 
                key={biz.id}
                onClick={() => setActiveCategory(biz.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${activeCategory === biz.id ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${activeCategory === biz.id ? 'bg-white' : 'bg-slate-300'}`}></div>
                {biz.name}
              </button>
            ))}
          </div>

          {/* 🔴 Filtered Batch Cards Grid 🔴 */}
          {loading ? (
             <div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-red-600" size={50}/></div>
          ) : displayedBatches.length === 0 ? (
             <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm text-slate-500 font-medium">No programs available in this category.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {displayedBatches.map(batch => (
                <div key={batch.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-center text-center">
                  
                  {/* Large Logo centered at the top */}
                  <div className="w-full h-32 flex items-center justify-center mb-6">
                    {batch.logo ? (
                      <img src={`${api.defaults.baseURL.replace('/api','')}/storage/icons/${batch.logo}`} alt={batch.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <GraduationCap size={60} className="text-slate-300" />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 mb-4">{batch.name}</h3>
                  
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1 line-clamp-4">
                    {batch.description || "Prepare for success with the most effective learning program designed to thoroughly equip students within a short period."}
                  </p>
                  
                  {/* The Two Red Buttons */}
                  <div className="flex w-full gap-3 mt-auto">
                    <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-sm">
                      View Details
                    </button>
                    <Link to="/register" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors shadow-sm text-sm">
                      Register
                    </Link>
                  </div>
                  
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t-4 border-red-600" id="contact">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="IMA Logo" className="h-12 grayscale brightness-200" />
              <span className="text-2xl font-black text-white tracking-tight">IMA Campus</span>
            </div>
            <p className="max-w-md leading-relaxed">
              Empowering globally ready graduates through innovative education, expert mentorship, and a vibrant student community.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-white uppercase tracking-wider mb-2">Quick Links</h4>
            <ul className="space-y-3 font-medium">
              <li><a href="#about-us" className="hover:text-red-500 transition">About Us</a></li>
              <li><a href="#programs" className="hover:text-red-500 transition">Our Programs</a></li>
              <li><Link to="/login" className="hover:text-red-500 transition">Student Login</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-black text-white uppercase tracking-wider mb-2">Contact Info</h4>
            <ul className="space-y-3 font-medium">
              <li className="flex items-start gap-3"><Phone size={16} className="text-red-500 mt-0.5 shrink-0"/> (+94) 112 345 678</li>
              <li className="flex items-start gap-3"><Mail size={16} className="text-red-500 mt-0.5 shrink-0"/> info@imacampus.lk</li>
              <li className="flex items-start gap-3"><Globe size={16} className="text-red-500 mt-0.5 shrink-0"/> 123 Education Mawatha, Colombo 03</li>
            </ul>
          </div>
        </div>
        <div className="max-w-screen-2xl mx-auto border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
           <p>© {new Date().getFullYear()} IMA Campus. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// --- Helper Components ---
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function AboutIconText({ icon, text }) {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="text-red-600 bg-red-50 p-3 rounded-xl">{icon}</div>
      <span className="font-bold text-slate-800">{text}</span>
    </div>
  );
}