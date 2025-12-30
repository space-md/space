const { useState, useEffect, useRef, useMemo } = React;

// --- 1. COMPONENTES HELPER ---
const Icon = ({ icon, className }) => {
  const iconMap = {
    'zap': 'lucide:zap',
    'search': 'lucide:search',
    'map-pin': 'lucide:map-pin',
    'star': 'lucide:star',
    'filter': 'lucide:filter',
    'chevron-down': 'lucide:chevron-down',
    'check': 'lucide:check',
    'sliders-horizontal': 'lucide:sliders-horizontal',
    'heart': 'lucide:heart',
    'rocket': 'lucide:rocket',
    'bookmark': 'lucide:bookmark',
    'utensils': 'lucide:utensils',
    'shopping-bag': 'lucide:shopping-bag',
    'globe': 'lucide:globe',
    'magnet': 'lucide:magnet',
    'menu': 'lucide:menu',
    'x': 'lucide:x',
    'facebook': 'mdi:facebook'
  };
  const iconName = iconMap[icon] || icon;
  
  return (
    /* CORRECCIÓN: Key en el contenedor para evitar el error de removeChild con Iconify */
    <div key={`${iconName}-${className}`} className="flex items-center justify-center pointer-events-none" style={{ display: 'inline-flex' }}>
      <span 
        className={`iconify ${className}`} 
        data-icon={iconName} 
        data-inline="false"
      ></span>
    </div>
  );
};

// --- 2. APP PRINCIPAL ---
const DirectoryApp = () => {
  const [companiesData, setCompaniesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortScores, setSortScores] = useState({});

  useEffect(() => {
    fetch('./data.json')
      .then(response => {
        if (!response.ok) throw new Error("Error al cargar data.json");
        return response.json();
      })
      .then(data => {
        setCompaniesData(data);
        const scores = {};
        data.forEach(c => {
          let weight = 1; 
          if (c.tier === 'socio') weight = 3; 
          if (c.tier === 'boost') weight = 1.5; 
          scores[c.id] = (Math.random() + 0.5) * weight;
        });
        setSortScores(scores);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fallo la carga:", err);
        setLoading(false);
      });
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSpace, setActiveSpace] = useState('Todos'); 
  const [activeSubFilter, setActiveSubFilter] = useState('Todos'); 
  const [activeLocation, setActiveLocation] = useState('Todas las zonas'); 
  const [showMyList, setShowMyList] = useState(false);
  
  const [likedCompanies, setLikedCompanies] = useState(() => {
    const saved = localStorage.getItem('space_likes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('space_likes', JSON.stringify(likedCompanies));
  }, [likedCompanies]);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const dropdownRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const controlNavbar = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setIsVisible(false);
        setIsDropdownOpen(false);
        setIsFilterOpen(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(window.scrollY);
    };
    window.addEventListener('scroll', controlNavbar);
    
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener('scroll', controlNavbar);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [lastScrollY]);

  const processedCompanies = useMemo(() => {
    if (loading) return [];
    let result = activeSpace === 'Todos' ? companiesData : companiesData.filter(c => c.space === activeSpace);
    if (showMyList) result = result.filter(c => likedCompanies.includes(c.id));
    const filtered = result.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSubFilter = activeSubFilter === 'Todos' || 
                               (Array.isArray(c.type) ? c.type.includes(activeSubFilter) : c.type === activeSubFilter);
                               
      const matchesLocation = activeLocation === 'Todas las zonas' || c.location === activeLocation;
      return matchesSearch && matchesSubFilter && matchesLocation;
    });
    return filtered.sort((a, b) => (sortScores[b.id] || 0) - (sortScores[a.id] || 0));
  }, [activeSpace, activeSubFilter, activeLocation, searchTerm, showMyList, likedCompanies, sortScores, companiesData, loading]);

  const activeSponsors = useMemo(() => {
    if (loading) return [];
    const sponsors = companiesData.filter(c => c.tier === 'socio' && (activeSpace === 'Todos' || c.space === activeSpace));
    return sponsors.sort((a, b) => (sortScores[b.id] || 0) - (sortScores[a.id] || 0));
  }, [activeSpace, companiesData, loading, sortScores]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeSponsors.length > 1) {
        setCurrentBannerIndex((prev) => (prev + 1) % activeSponsors.length);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSponsors.length]);

  useEffect(() => {
    setCurrentBannerIndex(0);
  }, [activeSpace, showMyList]); // CORRECCIÓN: Resetear índice al cambiar a "Mi Lista"

  const toggleLike = (id) => {
    setLikedCompanies(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSpaceChange = (space) => {
    setActiveSpace(space);
    setActiveSubFilter('Todos');
    setActiveLocation('Todas las zonas');
    setIsDropdownOpen(false);
    setShowMyList(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocationChange = (loc) => {
    setActiveLocation(loc);
    setIsFilterOpen(false);
  }

  const getActionIcon = (actionType) => {
    const icons = { 
      'menu': 'utensils', 
      'ecommerce': 'shopping-bag', 
      'web': 'globe', 
      'facebook': 'facebook', 
      'funnel': 'magnet' 
    };
    return icons[actionType] || 'globe';
  };
  
  const getActionLabel = (actionType) => {
     const labels = { 
       'menu': 'Ver Menú', 
       'ecommerce': 'Ir a Tienda', 
       'web': 'Sitio Web', 
       'facebook': 'Facebook',
       'funnel': 'Empezar' 
     };
     return labels[actionType] || 'Ver más';
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
          </div>
      )
  }

  const spacesList = ['Todos', ...new Set(companiesData.map(c => c.space))];
  const companiesInContext = activeSpace === 'Todos' ? companiesData : companiesData.filter(c => c.space === activeSpace);
  
  const allTypes = companiesInContext.reduce((acc, c) => {
    if (Array.isArray(c.type)) return [...acc, ...c.type];
    return [...acc, c.type];
  }, []);
  const availableSubFilters = ['Todos', ...new Set(allTypes)];
  const availableLocations = ['Todas las zonas', ...new Set(companiesInContext.map(c => c.location))];

  return (
    <React.Fragment>
      <header className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-6xl mx-auto px-4 pt-3 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 group outline-none">
                <div className="bg-black text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300 flex items-center justify-center">
                  <Icon icon="zap" className="text-xl text-white" />
                </div>
                <h1 className="text-2xl font-black tracking-tighter text-gray-900 flex items-center gap-1 uppercase">
                  {activeSpace === 'Todos' ? 'SPACE' : activeSpace}
                  <Icon icon="chevron-down" className={`text-xl transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </h1>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 dropdown-animate">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 border-b border-gray-50 mb-1">Dimensiones</div>
                  <div className="max-h-60 overflow-y-auto pr-1">
                    {spacesList.map((space) => (
                      <button key={space} onClick={() => handleSpaceChange(space)} className={`w-full text-left px-3 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-colors mb-0.5 ${activeSpace === space ? 'bg-gray-50 text-black' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        {space} {activeSpace === space && <Icon icon="check" className="text-green-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
              <button onClick={() => setShowMyList(!showMyList)} className={`px-3 py-2.5 rounded-xl flex items-center justify-center transition-all border ${showMyList ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}>
                <Icon icon="bookmark" className={`text-xl ${showMyList ? 'text-rose-600' : ''}`} />
                {showMyList && <span className="ml-2 text-xs font-bold hidden md:inline">Mi Lista</span>}
              </button>
              <div className="relative group flex-1 md:w-56">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon icon="search" className="text-gray-400" /></div>
                <input type="text" className="block w-full pl-9 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none placeholder-gray-500" placeholder={showMyList ? "Buscar en mis..." : `Buscar en ${activeSpace}...`} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="relative" ref={filterRef}>
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`h-full px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${activeLocation !== 'Todas las zonas' ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  <Icon icon="sliders-horizontal" className="text-xl" />
                  {activeLocation !== 'Todas las zonas' && <span className="ml-1 text-xs font-bold hidden md:inline">{activeLocation}</span>}
                </button>
                {isFilterOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 dropdown-animate">
                    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-50 mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zona</span>
                      {activeLocation !== 'Todas las zonas' && <button onClick={() => handleLocationChange('Todas las zonas')} className="text-[10px] text-red-500 font-bold hover:underline">Borrar</button>}
                    </div>
                    <div className="max-h-60 overflow-y-auto pr-1">
                      {availableLocations.map((loc) => (
                        <button key={loc} onClick={() => handleLocationChange(loc)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors mb-0.5 ${activeLocation === loc ? 'bg-gray-100 text-black font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                          {loc} {activeLocation === loc && <Icon icon="check" className="text-black" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {activeSpace !== 'Todos' && availableSubFilters.length > 1 && !showMyList && (
            <div className="border-t border-gray-50 pt-2 flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1 flex-shrink-0">Tipo:</span>
              {availableSubFilters.map((sub) => (
                <button key={sub} onClick={() => setActiveSubFilter(sub)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-300 border ${activeSubFilter === sub ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}>{sub}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className={`w-full mx-auto px-4 pb-8 transition-all duration-300 ${activeSpace === 'Todos' ? 'pt-24 md:pt-24' : 'pt-36 md:pt-40'}`}>
        
        {/* --- BANNER PUBLICIDAD (SOCIOS) --- */}
        {!showMyList && activeSponsors.length > 0 && !searchTerm && activeSubFilter === 'Todos' && activeLocation === 'Todas las zonas' && activeSponsors[currentBannerIndex] && (
          <div key="banner-section" className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-baseline mb-2 px-1">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">DESTACADOS</h3>
               {activeSponsors.length > 1 && (
                 <div className="flex gap-1">
                   {activeSponsors.map((_, idx) => (
                     <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === currentBannerIndex ? 'w-6 bg-black' : 'w-1 bg-gray-300'}`}/>
                   ))}
                 </div>
               )}
            </div>
            
            <div className="relative group/slider">
              <div 
                key={activeSponsors[currentBannerIndex].id}
                className="relative w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-auto md:h-[300px] transition-all duration-500" 
                style={{ backgroundColor: activeSponsors[currentBannerIndex].color }}
              >
                 <div className="relative z-10 w-full md:w-[300px] h-[300px] flex-shrink-0 bg-black/10">
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      {activeSponsors[currentBannerIndex].bannerImage ? (
                        <img 
                          src={activeSponsors[currentBannerIndex].bannerImage} 
                          alt={activeSponsors[currentBannerIndex].name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-white text-6xl font-black opacity-20">{activeSponsors[currentBannerIndex].name.charAt(0)}</span>
                      )}
                    </div>
                 </div>

                 <div className="relative z-10 p-6 md:pr-10 md:pl-10 flex-1 flex flex-col justify-center text-center md:text-left overflow-hidden">
                   <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                   
                   <div className="relative z-20">
                     <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white border border-white/20">
                          {activeSponsors[currentBannerIndex].space}
                        </span>
                        {activeSponsors[currentBannerIndex].locationLink ? (
                          <a href={activeSponsors[currentBannerIndex].locationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-1 rounded-full text-white hover:bg-black/40 transition-colors">
                            <Icon icon="map-pin" /> {activeSponsors[currentBannerIndex].location}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-1 rounded-full text-white">
                            <Icon icon="map-pin" /> {activeSponsors[currentBannerIndex].location}
                          </span>
                        )}
                     </div>
                     <h2 className="text-3xl md:text-5xl font-black leading-tight mb-2 text-white tracking-tighter truncate w-full">
                       {activeSponsors[currentBannerIndex].name}
                     </h2>
                     <p className="text-white/90 font-medium text-sm md:text-base mb-6 max-w-lg leading-relaxed line-clamp-2 mx-auto md:mx-0">
                       {activeSponsors[currentBannerIndex].description}
                     </p>
                     
                     <div key={`btn-group-${activeSponsors[currentBannerIndex].id}`} className="flex justify-center md:justify-start gap-3">
                       <a href={`https://wa.me/${activeSponsors[currentBannerIndex].whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-transform active:scale-95 shadow-xl">
                          <Icon icon="zap" className="text-black" /> Contactar
                       </a>
                       {activeSponsors[currentBannerIndex].actionType !== "empty" && (
                          <a href={activeSponsors[currentBannerIndex].actionLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-xl font-bold text-sm hover:bg-black/40 transition-transform active:scale-95 shadow-xl">
                            <Icon icon={getActionIcon(activeSponsors[currentBannerIndex].actionType)} />
                            {getActionLabel(activeSponsors[currentBannerIndex].actionType)}
                          </a>
                       )}
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* --- GRID DE TARJETAS --- */}
        <div key="grid-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {processedCompanies.map((company) => {
            const hasAction = company.actionType && company.actionType !== "empty";
            const actionIcon = hasAction ? getActionIcon(company.actionType) : null;
            const isLiked = likedCompanies.includes(company.id);
            
            return (
              <div key={company.id} className={`group relative flex flex-col bg-white rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${company.tier === 'socio' ? 'partner-card shadow-2xl' : 'shadow-sm border border-gray-100'}`}>
                <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
                  {company.tier === 'socio' && <span className="bg-yellow-400 text-black font-extrabold px-3 py-1 rounded-full text-[10px] uppercase shadow-lg tracking-wider animate-pulse">SOCIO</span>}
                  {company.tier === 'boost' && <span className="bg-blue-600 text-white font-extrabold px-3 py-1 rounded-full text-[10px] uppercase shadow-lg tracking-wider">BOOST</span>}
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleLike(company.id); }} 
                  className={`group absolute top-4 right-4 z-30 w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-sm active:scale-90 ${isLiked ? 'bg-white' : 'bg-white/20 backdrop-blur-md hover:bg-white'}`}
                >
                  <Icon 
                    icon="heart" 
                    className={`text-xl transition-colors ${isLiked ? 'text-rose-500' : 'text-white group-hover:text-rose-500'}`} 
                  />
                </button>
                
                <div className="h-32 w-full relative overflow-hidden" style={{ backgroundColor: company.color }}>
                   <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`, backgroundSize: '12px 12px' }}></div>
                   
                   {company.locationLink ? (
                      <a 
                        href={company.locationLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white border border-white/10 shadow-sm z-30 hover:bg-black/60 transition-all active:scale-95"
                      >
                        <Icon icon="map-pin" className="text-white/90" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{company.location}</span>
                      </a>
                   ) : (
                      <div className="absolute bottom-4 right-4 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white border border-white/10 shadow-sm z-10">
                        <Icon icon="map-pin" className="text-white/90" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{company.location}</span>
                      </div>
                   )}
                </div>

                <div className="px-7 pb-7 pt-0 flex-1 flex flex-col relative z-10">
                  <div className="flex justify-between items-end -mt-12 mb-4">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-xl border-[5px] border-white overflow-hidden" style={{ backgroundColor: company.color }}>
                      {company.profileImage ? (
                        <img src={company.profileImage} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        company.name.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-blue-900 transition-colors">{company.name}</h2>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium line-clamp-2 mb-4">{company.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleSpaceChange(company.space); }} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200 hover:bg-black hover:text-white transition-colors">
                        {company.space}
                      </button>
                      {Array.isArray(company.type) ? (
                        company.type.map((t, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-400 border border-gray-100">
                          {company.type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-50 flex gap-2">
                    <a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex-1 overflow-hidden rounded-xl transition-transform active:scale-[0.98] shadow-lg" style={{ backgroundColor: company.color }}>
                      <div className="px-4 py-3.5 flex items-center justify-center gap-2 text-white font-bold text-sm tracking-wide">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span>Contactar</span>
                      </div>
                    </a>
                    {hasAction && (
                     <a href={company.actionLink} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden rounded-xl transition-transform active:scale-[0.98] w-14 flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: company.color }}>
                       <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                       <Icon icon={actionIcon} className="text-xl" />
                     </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {processedCompanies.length === 0 && (
          <div key="empty-state" className="flex flex-col items-center justify-center py-20 text-center opacity-50">
            <Icon icon="filter" className="text-4xl text-gray-300 mb-3" />
            <p className="text-sm font-semibold text-gray-400">
              {activeSpace === 'Todos' ? 'El espacio está vacío.' : `No hay resultados aquí.`}
            </p>
          </div>
        )}
      </main>
    </React.Fragment>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DirectoryApp />);