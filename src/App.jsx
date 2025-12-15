import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { 
  ClipboardList, CheckCircle2, Store, Plane, Plus, Trash2, MapPin, 
  Shirt, Camera, ShoppingBag, ShoppingCart, ExternalLink, X, Hotel, Train, Bus, 
  AlertCircle, Navigation, CalendarDays, ArrowRight, ZoomIn, Palette
} from 'lucide-react'

function App() {
  // --- 資料狀態 ---
  const [items, setItems] = useState([])
  const [measurements, setMeasurements] = useState([]) 
  const [profiles, setProfiles] = useState([]) 
  const [stores, setStores] = useState([]) 
  const [categories, setCategories] = useState([]) 
  const [loading, setLoading] = useState(true)
  
  // --- UI 狀態 ---
  const [activeTab, setActiveTab] = useState('todo') 
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false) 
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  
  // 圖片預覽狀態
  const [previewImage, setPreviewImage] = useState(null)

  // 輔助狀態
  const [targetDay, setTargetDay] = useState('') 
  const [selectedStoreId, setSelectedStoreId] = useState('') 
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [isCustomCategory, setIsCustomCategory] = useState(false)

  // --- 新增表單狀態 ---
  const [newItem, setNewItem] = useState({
    item_name: '', category: '保暖層', quantity: 1, requester_id: '',
    size: '', color: '', purchase_note: '', store_suggestion_id: '', image_url: ''            
  })
  
  const [newStore, setNewStore] = useState({
    name: '', category: '戶外用品', address: '', google_map_link: '', buying_tips: '',
    plan_day: '' 
  })

  // 策略定義
  const strategyDays = [
    { id: 'Day 1', date: '12/19 (五)', title: 'Montbell & 雜貨', goal: '直衝京橋 Montbell 買保暖層，去 3COINS 買壓縮袋。' },
    { id: 'Day 2', date: '12/20 (六)', title: '神田滑雪街 (比價)', goal: '只看不買(除非特價)，試穿尺寸，紀錄價格。' },
    { id: 'Day 3', date: '12/21 (日)', title: '南町田 Outlet (撿漏)', goal: '看有沒有過季便宜貨。' },
    { id: 'Day 4', date: '12/22 (一)', title: '最終採購 & 補貨', goal: '回到最便宜的那家店下手。補齊藥妝。' },
    { id: 'Day 5', date: '12/23 (二)', title: '整理 & 返台', goal: '最後打包，前往機場。' },
  ]

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const { data: listData } = await supabase.from('shopping_list').select(`*, profiles (nickname, color_pref), stores (name)`).order('created_at', { ascending: false })
      setItems(listData || [])

      const existingCategories = [...new Set((listData || []).map(item => item.category).filter(Boolean))]
      setCategories([...new Set(['保暖層', '雪褲', '雪衣', '鞋子', '帽子', '藥妝', '零食', ...existingCategories])])

      const { data: measureData } = await supabase.from('measurements').select(`*, profiles (id, nickname, english_name, color_pref)`)
      setMeasurements(measureData || [])
      if (measureData?.length > 0) setSelectedMemberId(measureData[0].profiles.id)

      const { data: profileData } = await supabase.from('profiles').select('*')
      setProfiles(profileData || [])
      if (profileData?.length > 0 && !newItem.requester_id) setNewItem(prev => ({ ...prev, requester_id: profileData[0].id }))

      const { data: storeData } = await supabase.from('stores').select('*').order('name')
      setStores(storeData || [])
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const togglePurchase = async (id, currentStatus) => {
    try {
      setItems(items.map(item => item.id === id ? { ...item, is_purchased: !currentStatus } : item))
      await supabase.from('shopping_list').update({ is_purchased: !currentStatus }).eq('id', id)
    } catch (error) { alert('更新失敗'); fetchAllData() }
  }

  const handleDelete = async (id) => {
    if (!confirm('確定要刪除嗎？')) return
    try {
      setItems(items.filter(item => item.id !== id))
      await supabase.from('shopping_list').delete().eq('id', id)
    } catch (error) { alert('刪除失敗') }
  }

  const handleAddItem = async (e) => {
    e.preventDefault(); if (!newItem.item_name) return alert('請輸入品項名稱')
    try {
      const payload = { ...newItem, store_suggestion_id: newItem.store_suggestion_id || null }
      const { error } = await supabase.from('shopping_list').insert([payload])
      if (error) throw error
      setShowAddModal(false)
      setNewItem({ ...newItem, item_name: '', image_url: '', purchase_note: '', size: '', color: '' })
      fetchAllData(); alert('新增成功！')
    } catch (error) { alert('新增失敗') }
  }

  const handleAddStore = async (e) => {
    e.preventDefault(); if (!newStore.name) return alert('請輸入店名')
    try {
      const { error } = await supabase.from('stores').insert([newStore])
      if (error) throw error
      setShowAddStoreModal(false)
      setShowAssignModal(false)
      setNewStore({ name: '', category: '戶外用品', address: '', google_map_link: '', buying_tips: '', plan_day: '' })
      fetchAllData(); alert('商店新增成功！')
    } catch (error) { alert('新增失敗') }
  }

  const handleDeleteStore = async (id) => {
    if (!confirm('確定要刪除這間商店嗎？')) return
    try {
      setStores(stores.filter(s => s.id !== id))
      await supabase.from('stores').delete().eq('id', id)
      setTimeout(fetchAllData, 500) 
    } catch (error) { alert('刪除失敗') }
  }

  const openAssignModal = (dayId) => {
    setTargetDay(dayId)
    setSelectedStoreId('')
    setNewStore(prev => ({ ...prev, plan_day: dayId }))
    setShowAssignModal(true)
  }

  const handleAssignStore = async () => {
    if (!selectedStoreId) return alert('請選擇一間商店')
    try {
      const { error } = await supabase.from('stores').update({ plan_day: targetDay }).eq('id', selectedStoreId)
      if (error) throw error
      setShowAssignModal(false)
      fetchAllData()
      alert('排程更新成功！')
    } catch (error) { alert('排程失敗') }
  }

  const displayItems = items.filter(item => activeTab === 'todo' ? !item.is_purchased : item.is_purchased)
  const getBadgeColor = (nickname) => { return 'bg-gray-100 text-gray-600 border-gray-200' }

  if (loading) return <div className="flex h-screen items-center justify-center text-xl text-ruri animate-pulse">載入中...</div>

  return (
    <div className="min-h-screen bg-gofun pb-32 font-sans text-sumi">
      {/* Header */}
      <header className="bg-ruri text-white p-4 sticky top-0 z-20 shadow-md">
        <h1 className="text-lg font-bold text-center tracking-widest flex items-center justify-center gap-2">
           {/* [UPDATED] Icon changed to ShoppingCart */}
           <ShoppingCart className="w-5 h-5" /> 東京採購特攻隊
        </h1>
        <div className="flex justify-between text-xs mt-3 px-2 opacity-90 font-light">
          <span className="flex items-center gap-1"><Store className="w-3 h-3"/> 12/19 - 12/23</span>
          <span>進度: {items.filter(i => i.is_purchased).length}/{items.length}</span>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-white/95 backdrop-blur-sm shadow-sm sticky top-[72px] z-10 overflow-x-auto border-b border-gray-100 no-scrollbar">
        <TabButton icon={<ClipboardList size={18}/>} label="待購" active={activeTab === 'todo'} onClick={() => setActiveTab('todo')} color="ruri" />
        <TabButton icon={<CheckCircle2 size={18}/>} label="完成" active={activeTab === 'done'} onClick={() => setActiveTab('done')} color="green" />
        <TabButton icon={<CalendarDays size={18}/>} label="攻略" active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} color="red" />
        <TabButton icon={<Store size={18}/>} label="店家" active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} color="orange" />
        <TabButton icon={<Plane size={18}/>} label="資訊" active={activeTab === 'info'} onClick={() => setActiveTab('info')} color="purple" />
      </div>

      {/* Main Content */}
      <main className="p-3 space-y-3">
        {/* VIEW: Shopping List */}
        {(activeTab === 'todo' || activeTab === 'done') && (
          <>
            {displayItems.length === 0 && <div className="text-center text-gray-400 py-20 text-sm">無項目</div>}
            {displayItems.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex gap-3 relative transition-all ${item.is_purchased ? 'opacity-50 grayscale' : ''}`}>
                
                {/* Image Container with Zoom Click */}
                <div 
                  className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100 relative cursor-zoom-in active:scale-95 transition-transform"
                  onClick={() => item.image_url ? setPreviewImage(item.image_url) : null}
                >
                   {item.image_url ? (
                     <>
                       <img src={item.image_url} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                       <div className="absolute bottom-0 right-0 bg-black/50 text-white p-0.5 rounded-tl-md"><ZoomIn size={10} /></div>
                     </>
                   ) : (
                     <ShoppingBag className="text-gray-300 w-6 h-6" />
                   )}
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${getBadgeColor(item.profiles?.nickname)}`}>{item.profiles?.nickname}</span>
                    <div className="flex gap-1">
                       {item.stores?.name && <span className="text-[10px] text-ruri bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded truncate max-w-[80px] flex items-center gap-0.5"><MapPin size={8} />{item.stores.name}</span>}
                       <span className="text-[10px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">{item.category}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sumi text-base truncate leading-tight">{item.item_name}</h3>
                  {item.product_code && <div className="text-xs text-yellow-700 font-mono bg-yellow-50 px-1.5 py-0.5 inline-block rounded border border-yellow-100 mt-1.5">No. {item.product_code}</div>}
                  
                  <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-2 items-center">
                    {item.size && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Shirt size={10}/> {item.size}</span>}
                    {item.color && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Palette size={10}/> {item.color}</span>}
                    <span className="text-sumi font-bold bg-gray-100 px-1.5 rounded">x{item.quantity}</span>
                  </div>
                  
                   {item.purchase_note && <div className="text-xs text-gray-400 mt-1 italic">📝 {item.purchase_note}</div>}
                </div>
                {/* Vertical Actions */}
                <div className="flex flex-col justify-between items-center gap-2 pl-2 border-l border-gray-100 w-12 flex-shrink-0">
                  {!item.is_purchased && <button onClick={() => handleDelete(item.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-karakurenai active:scale-95 transition-all"><Trash2 size={20} /></button>}
                  {item.is_purchased && <div className="flex-1"></div>}
                  <label className={`w-10 h-10 flex items-center justify-center rounded-xl border cursor-pointer active:scale-95 transition-all ${item.is_purchased ? 'bg-green-50 border-green-200 text-green-600' : 'bg-blue-50 border-blue-100 text-ruri'}`}>
                    <input type="checkbox" checked={item.is_purchased} onChange={() => togglePurchase(item.id, item.is_purchased)} className="hidden" />
                    {item.is_purchased ? <CheckCircle2 size={22} /> : <div className="w-5 h-5 rounded border-2 border-current" />}
                  </label>
                </div>
              </div>
            ))}
          </>
        )}

        {/* VIEW: Strategy */}
        {activeTab === 'strategy' && (
          <div className="space-y-6 pb-10">
            {strategyDays.map(day => {
              const dayStores = stores.filter(s => s.plan_day === day.id)
              return (
                <div key={day.id} className="relative pl-4 border-l-2 border-ruri/20 last:border-0">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-ruri border-2 border-white shadow-sm"></div>
                  <div className="mb-3 flex justify-between items-start">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <h3 className="font-bold text-ruri text-lg">{day.id}</h3>
                        <span className="text-xs text-gray-400 font-mono">{day.date}</span>
                      </div>
                      <h4 className="font-bold text-sumi">{day.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{day.goal}</p>
                    </div>
                    <button onClick={() => openAssignModal(day.id)} className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg border border-orange-100 flex items-center gap-1 active:scale-95 transition-transform font-bold">
                      <Plus size={14}/> 排入
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dayStores.length === 0 && <div className="text-xs text-gray-300 italic pl-2">尚未安排</div>}
                    {dayStores.map(store => (
                      <div key={store.id} className="bg-white rounded-lg border border-gray-100 p-3 shadow-sm flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-sm text-sumi">{store.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{store.category}</div>
                          {store.buying_tips && <div className="text-[10px] text-orange-600 mt-1">💡 {store.buying_tips}</div>}
                        </div>
                        {store.google_map_link && <a href={store.google_map_link} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-ruri rounded-lg"><Navigation size={16}/></a>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* VIEW: Stores List */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
             {stores.map(store => (
               <div key={store.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 relative">
                  <div className="mb-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-sumi">{store.name}</h3>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{store.plan_day || '未排程'}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 flex items-start gap-1"><MapPin size={12} className="mt-0.5 flex-shrink-0"/> {store.address || '無地址'}</p>
                  </div>
                  {store.buying_tips && <div className="mb-4 bg-yellow-50 p-2.5 rounded-lg text-xs text-gray-600 border border-yellow-100 leading-relaxed"><span className="font-bold text-yellow-700 block mb-1">💡 採購重點：</span>{store.buying_tips}</div>}
                  <div className="flex gap-2 border-t border-gray-50 pt-3">
                    {store.google_map_link && <a href={store.google_map_link} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-ruri/5 text-ruri py-2.5 rounded-xl border border-ruri/20 text-xs font-bold active:bg-ruri/10 transition-colors"><Navigation size={16} /> 導航</a>}
                    <button onClick={() => handleDeleteStore(store.id)} className="w-12 flex items-center justify-center bg-red-50 text-karakurenai rounded-xl border border-red-100 active:scale-95 transition-all"><Trash2 size={20} /></button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* VIEW: Info */}
        {activeTab === 'info' && (
          <div className="space-y-4 pb-10">
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-ruri p-4">
               <h3 className="text-base font-bold text-ruri flex items-center gap-2 mb-3"><Plane className="rotate-45" size={20} /> 去程 (MM620)</h3>
               <div className="text-sm text-gray-600 space-y-2"><div className="flex justify-between items-center font-bold text-sumi text-lg"><span>02:25 桃園</span><span className="text-gray-300">➔</span><span>06:30 成田</span></div><div className="bg-red-50 text-karakurenai px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5"><AlertCircle size={14}/> 01:35 關櫃</div></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-orange-400 p-4">
               <h3 className="text-base font-bold text-orange-600 flex items-center gap-2 mb-2"><Hotel size={20} /> 飯店資訊</h3>
               <p className="font-bold text-sumi text-lg">Hotel LiVEMAX Kayabacho</p>
               <p className="text-sm text-gray-500 mt-1 flex gap-1"><MapPin size={14} className="mt-0.5"/> 〒103-0025 東京都中央区日本橋茅場町3-7-3</p>
               <div className="mt-4"><a href="https://www.google.com/maps/dir/?api=1&destination=Hotel+LiVEMAX+Kayabacho" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-orange-50 text-orange-600 py-3 rounded-xl font-bold border border-orange-100 hover:bg-orange-100 transition-colors shadow-sm"><MapPin size={18} /> 帶我去飯店</a></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-gray-400 p-4">
               <h3 className="text-base font-bold text-gray-700 flex items-center gap-2 mb-4"><Train size={20} /> 機場交通 (成田 ⮂ 茅場町)</h3>
               <div className="space-y-6">
                 <div className="border-b border-gray-100 pb-4"><div className="flex justify-between items-center mb-1"><span className="font-bold text-sumi flex items-center gap-1.5"><Train size={16} className="text-gray-400"/> 方案 A：京成 Access</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono">¥1,400</span></div><p className="text-xs text-gray-500 leading-relaxed mb-3">成田機場 ➔ Access 特急 (往羽田) ➔ <strong>日本橋站</strong> 下車 ➔ 走路 8 分鐘。</p><a href="https://www.google.com/maps/dir/?api=1&origin=Narita+International+Airport&destination=Hotel+LiVEMAX+Kayabacho&travelmode=transit" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"><Navigation size={18} /> 導航：機場 ➔ 飯店 (鐵路)</a></div>
                 <div><div className="flex justify-between items-center mb-1"><span className="font-bold text-sumi flex items-center gap-1.5"><Bus size={16} className="text-gray-400"/> 方案 B：利木津巴士</span><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono">¥2,800</span></div><p className="text-xs text-gray-500 leading-relaxed mb-3">成田機場 ➔ 利木津巴士往「T-CAT」 ➔ T-CAT (水天宮前站) ➔ 走路 10 分鐘到飯店。</p><a href="https://www.google.com/maps/dir/?api=1&origin=Narita+Airport&destination=Tokyo+City+Air+Terminal&travelmode=transit" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"><Navigation size={18} /> 導航：機場 ➔ 飯店 (巴士優先)</a></div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* FAB */}
      {(activeTab === 'todo' || activeTab === 'done' || activeTab === 'stores') && (
        <button onClick={() => activeTab === 'stores' ? setShowAddStoreModal(true) : setShowAddModal(true)}
          className={`fixed bottom-24 right-5 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center active:scale-95 transition-all z-30 ${activeTab === 'stores' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-ruri hover:bg-ruri-light'}`}>
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-kon-kikyo text-gray-400 border-t border-gray-800 p-2 pb-5 flex justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <NavButton icon={<ClipboardList size={22} />} label="清單" active={activeTab === 'todo'} onClick={() => { setActiveTab('todo'); setShowAddModal(false); }} />
        <button className="flex flex-col items-center justify-center bg-white text-ruri w-14 h-14 rounded-full -mt-8 shadow-xl border-4 border-gofun relative z-10 active:scale-95 transition-transform" onClick={() => setShowSizeModal(true)}>
          <Shirt size={28} strokeWidth={2} />
        </button>
        <NavButton icon={<Camera size={22} />} label="掃描" active={false} onClick={() => alert('開發中')} />
      </footer>

      {/* Modal: Image Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2" onClick={() => setPreviewImage(null)}><X size={32}/></button>
        </div>
      )}

      {/* Modal: Size Card */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-kon-kikyo/90 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto h-[90vh] sm:h-auto flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-lg text-sumi flex items-center gap-2"><Shirt size={20} className="text-ruri"/> 身形尺寸卡</h2>
              <button onClick={() => setShowSizeModal(false)} className="text-gray-400 hover:text-sumi p-1 bg-white rounded-full border border-gray-200"><X size={20}/></button>
            </div>
            <div className="grid grid-cols-5 gap-2 p-3 border-b border-gray-100 bg-white">
              {measurements.map(m => (
                <button key={m.id} onClick={() => setSelectedMemberId(m.profiles.id)} className={`py-2 rounded-lg text-xs font-bold transition-all truncate ${selectedMemberId === m.profiles.id ? 'bg-ruri text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{m.profiles.english_name}</button>
              ))}
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-white flex flex-col items-center">
              {measurements.filter(m => m.profiles.id === selectedMemberId).map(m => (
                <div key={m.id} className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-row gap-4 items-start">
                    <div className="w-1/2"><BodyVisualWithFists /></div>
                    <div className="w-1/2 flex flex-col gap-2">
                      <SizeRow num="1" label="身長" jp="Height" val={m.height} />
                      <SizeRow num="2" label="袖丈" jp="Arm" val={m.arm_length} highlight />
                      <SizeRow num="3" label="ウエスト" jp="Waist" val={m.waist} />
                      <SizeRow num="4" label="ヒップ" jp="Hip" val={m.hip} />
                      <SizeRow num="5" label="総丈" jp="Leg" val={m.leg_length} highlight />
                      <SizeRow num="6" label="足" jp="Foot" val={m.foot_length} />
                    </div>
                  </div>
                  {m.profiles.color_pref && <div className="mt-4 text-center"><span className="text-xs text-gray-400">偏好色系</span><div className="text-ruri font-bold text-lg">{m.profiles.color_pref}</div></div>}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowSizeModal(false)} className="w-full py-3.5 bg-sumi text-white rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform">關閉 (Close)</button></div>
          </div>
        </div>
      )}

      {/* Modal: Assign Store */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold text-lg flex items-center gap-2"><CalendarDays size={20}/> 排入 {targetDay}</h3>
              <button onClick={() => setShowAssignModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">請選擇已經建立的商店，將其移動到這一天。</p>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">選擇商店</label>
                <select className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 text-base outline-none" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}>
                  <option value="">-- 請選擇 --</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.plan_day ? `(目前在 ${s.plan_day})` : ''}</option>)}
                </select>
              </div>
              <button onClick={handleAssignStore} className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold shadow-lg mt-2 active:scale-[0.98]">確認排入 (Assign)</button>
              <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-300 text-xs">或</span><div className="flex-grow border-t border-gray-200"></div></div>
              <button onClick={() => setShowAddStoreModal(true)} className="w-full bg-white text-orange-500 border border-orange-200 py-3 rounded-xl font-bold text-sm active:scale-[0.98]">建立新商店並排入...</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-ruri p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2"><Plus size={20}/> 新增願望</h3>
              <button onClick={() => setShowAddModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddItem} className="p-5 space-y-4">
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Requester</label><div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{profiles.map(p => (<button key={p.id} type="button" onClick={() => setNewItem({...newItem, requester_id: p.id})} className={`px-4 py-2 rounded-lg border text-sm flex-shrink-0 transition-all ${newItem.requester_id === p.id ? 'bg-blue-50 border-ruri text-ruri font-bold ring-1 ring-ruri' : 'border-gray-200 text-gray-500'}`}>{p.nickname}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                 <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Store</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm outline-none" value={newItem.store_suggestion_id} onChange={e => setNewItem({...newItem, store_suggestion_id: e.target.value})}><option value="">不指定</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Item Name</label><input type="text" placeholder="例如：發熱襪" className="w-full border border-gray-200 p-2.5 rounded-lg text-base outline-none" value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Image URL</label><input type="text" placeholder="https://..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} /></div>
              
              {/* Separated Size & Color Inputs */}
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Qty</label><input type="number" min="1" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Size</label><input type="text" placeholder="L" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.size} onChange={e => setNewItem({...newItem, size: e.target.value})} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Color</label><input type="text" placeholder="紅" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})} /></div>
              </div>
              
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Note</label><input type="text" placeholder="備註..." className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.purchase_note} onChange={e => setNewItem({...newItem, purchase_note: e.target.value})} /></div>
              <button type="submit" className="w-full bg-ruri text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform mt-2">確認新增</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold text-lg flex items-center gap-2"><Store size={20}/> 新增店家</h3>
              <button onClick={() => setShowAddStoreModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddStore} className="p-5 space-y-4">
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Name</label><input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm" value={newStore.category} onChange={e => setNewStore({...newStore, category: e.target.value})}><option value="戶外用品">戶外用品</option><option value="機能服飾">機能服飾</option><option value="生活雜貨">生活雜貨</option><option value="藥妝">藥妝</option><option value="其他">其他</option></select></div>
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Visit Day</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm font-bold text-orange-600" value={newStore.plan_day} onChange={e => setNewStore({...newStore, plan_day: e.target.value})}><option value="Day 1">Day 1</option><option value="Day 2">Day 2</option><option value="Day 3">Day 3</option><option value="Day 4">Day 4</option><option value="Day 5">Day 5</option></select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Address</label><input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.address} onChange={e => setNewStore({...newStore, address: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Map Link</label><input type="text" placeholder="https://..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.google_map_link} onChange={e => setNewStore({...newStore, google_map_link: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tips</label><textarea className="w-full border border-gray-200 p-2.5 rounded-lg h-20 text-sm resize-none" value={newStore.buying_tips} onChange={e => setNewStore({...newStore, buying_tips: e.target.value})} /></div>
              <button type="submit" className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold shadow-lg mt-2">新增商店</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ icon, label, active, onClick, color = 'ruri' }) {
  const colorClasses = {
    ruri: active ? 'text-ruri border-ruri' : 'text-gray-400 border-transparent hover:text-gray-500',
    green: active ? 'text-green-600 border-green-600' : 'text-gray-400 border-transparent hover:text-gray-500',
    orange: active ? 'text-orange-600 border-orange-600' : 'text-gray-400 border-transparent hover:text-gray-500',
    purple: active ? 'text-purple-600 border-purple-600' : 'text-gray-400 border-transparent hover:text-gray-500',
    red: active ? 'text-red-600 border-red-600' : 'text-gray-400 border-transparent hover:text-gray-500',
  }
  return (
    <button onClick={onClick} className={`flex-1 py-3 px-1 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 border-b-[3px] transition-all whitespace-nowrap ${colorClasses[color]}`}>
      {icon}<span>{label}</span>
    </button>
  )
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button className={`flex flex-col items-center justify-center w-16 transition-colors ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`} onClick={onClick}>
      {icon}<span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  )
}

function SizeRow({ num, label, jp, val, highlight }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded border ${highlight ? 'bg-blue-50 border-ruri' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-ruri text-white text-xs flex items-center justify-center font-bold">{num}</span>
        <span className="text-xs text-gray-500 font-bold">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold font-sans ${highlight ? 'text-ruri' : 'text-sumi'}`}>{val || '-'}</span>
        <span className="text-xs text-gray-400">cm</span>
      </div>
    </div>
  )
}

function BodyVisualWithFists() {
  return (
    <svg viewBox="0 0 200 400" className="w-full h-full drop-shadow-md">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L6,3 z" fill="#1E50A2" /></marker>
      </defs>
      <g stroke="#9ca3af" strokeWidth="1.5" fill="#f3f4f6">
        <circle cx="100" cy="40" r="25" />
        <path d="M100,65 L75,75 L75,180 L70,380 L95,380 L95,250 L105,250 L105,380 L130,380 L125,180 L125,75 Z" />
        <path d="M75,75 L50,150 L50,170 C45,170 45,185 50,185 C55,185 55,170 50,170 L75,85" />
        <path d="M125,75 L150,150 L150,170 C155,170 155,185 150,185 C145,185 145,170 150,170 L125,85" />
      </g>
      {/* 1. Height */}
      <line x1="20" y1="15" x2="20" y2="380" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrow)" />
      <circle cx="20" cy="200" r="8" fill="#1E50A2" />
      <text x="20" y="204" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">1</text>
      {/* 2. Arm */}
      <line x1="125" y1="75" x2="160" y2="180" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="150" cy="120" r="8" fill="#1E50A2" />
      <text x="150" y="124" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">2</text>
      {/* 3. Waist */}
      <line x1="75" y1="150" x2="125" y2="150" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="100" cy="150" r="8" fill="#1E50A2" />
      <text x="100" y="154" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">3</text>
      {/* 4. Hip */}
      <line x1="75" y1="180" x2="125" y2="180" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="100" cy="180" r="8" fill="#1E50A2" />
      <text x="100" y="184" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">4</text>
      {/* 5. Leg (Waist to Floor) */}
      <line x1="165" y1="150" x2="165" y2="380" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrow)" />
      <circle cx="165" cy="265" r="8" fill="#1E50A2" />
      <text x="165" y="269" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">5</text>
      {/* 6. Foot */}
      <line x1="60" y1="390" x2="100" y2="390" stroke="#1E50A2" strokeWidth="1" />
      <circle cx="80" cy="390" r="8" fill="#1E50A2" />
      <text x="80" y="394" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">6</text>
    </svg>
  )
}

export default App