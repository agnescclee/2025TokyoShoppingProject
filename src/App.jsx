import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { 
  ClipboardList, CheckCircle2, Store, Plane, Plus, Trash2, MapPin, 
  Shirt, Camera, ShoppingBag, ShoppingCart, ExternalLink, X, Hotel, Train, Bus, 
  AlertCircle, Navigation, CalendarDays, ArrowRight, ZoomIn, Palette, Coins, Edit, Save, Barcode, RotateCcw, Map as MapIcon, List, Wallet, ImagePlus, Loader2
} from 'lucide-react'

// --- 地圖相關引入 ---
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// --- 修復 Leaflet 圖標 ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  // --- 資料狀態 ---
  const [items, setItems] = useState([])
  const [measurements, setMeasurements] = useState([]) 
  const [profiles, setProfiles] = useState([]) 
  const [stores, setStores] = useState([]) 
  const [expenses, setExpenses] = useState([]) // [V26] 記帳資料
  const [categories, setCategories] = useState([]) 
  const [loading, setLoading] = useState(true)
  
  // --- UI 狀態 ---
  const [activeTab, setActiveTab] = useState('todo') 
  const [showSizeModal, setShowSizeModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false) 
  const [showAddStoreModal, setShowAddStoreModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false) // [V26] 記帳 Modal
  
  // 商店顯示模式
  const [storeViewMode, setStoreViewMode] = useState('list')

  // 圖片預覽
  const [previewImage, setPreviewImage] = useState(null)

  // 編輯模式狀態
  const [isEditingItem, setIsEditingItem] = useState(false) 
  const [editingItemId, setEditingItemId] = useState(null)  
  const [isEditingSize, setIsEditingSize] = useState(false) 
  const [isEditingStore, setIsEditingStore] = useState(false) 
  const [editingStoreId, setEditingStoreId] = useState(null)  

  // [V26] 上傳狀態
  const [isUploading, setIsUploading] = useState(false)

  // 輔助狀態
  const [targetDay, setTargetDay] = useState('') 
  const [selectedStoreId, setSelectedStoreId] = useState('') 
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  
  // --- 表單狀態 ---
  const [newItem, setNewItem] = useState({
    item_name: '', category: '保暖層', quantity: 1, requester_ids: [],
    size: '', color: '', purchase_note: '', store_suggestion_id: '', image_url: '',
    max_price: '', product_code: '' 
  })
  
  const [newStore, setNewStore] = useState({
    name: '', category: '戶外用品', address: '', google_map_link: '', buying_tips: '',
    plan_day: '', lat: '', lng: ''
  })

  // [V26] 記帳表單
  const [newExpense, setNewExpense] = useState({
    amount: '', store_name: '', category: '購物', note: '', receipt_url: ''
  })

  const [editMeasure, setEditMeasure] = useState({})

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
      const { data: listData } = await supabase.from('shopping_list').select(`*, stores (name)`).order('created_at', { ascending: false })
      setItems(listData || [])

      const existingCategories = [...new Set((listData || []).map(item => item.category).filter(Boolean))]
      setCategories([...new Set(['保暖層', '雪褲', '雪衣', '鞋子', '帽子', '藥妝', '零食', ...existingCategories])])

      const { data: measureData } = await supabase.from('measurements').select(`*, profiles (id, nickname, english_name, color_pref)`)
      setMeasurements(measureData || [])
      if (measureData?.length > 0 && !selectedMemberId) setSelectedMemberId(measureData[0].profiles.id)

      const { data: profileData } = await supabase.from('profiles').select('*')
      setProfiles(profileData || [])
      if (profileData?.length > 0 && newItem.requester_ids.length === 0) {
        setNewItem(prev => ({ ...prev, requester_ids: [profileData[0].id] }))
      }

      const { data: storeData } = await supabase.from('stores').select('*').order('plan_day', { ascending: true })
      setStores(storeData || [])

      // [V26] 抓取花費
      const { data: expenseData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false })
      setExpenses(expenseData || [])

    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  // --- Logic Helpers ---
  const toggleRequester = (profileId) => {
    const currentIds = newItem.requester_ids || []
    if (currentIds.includes(profileId)) {
      setNewItem({ ...newItem, requester_ids: currentIds.filter(id => id !== profileId) })
    } else {
      setNewItem({ ...newItem, requester_ids: [...currentIds, profileId] })
    }
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

  const openEditModal = (item) => {
    setIsEditingItem(true)
    setEditingItemId(item.id)
    setNewItem({
      item_name: item.item_name || '',
      category: item.category || '保暖層',
      quantity: item.quantity || 1,
      requester_ids: item.requester_ids || [], 
      size: item.size || '',
      color: item.color || '',
      purchase_note: item.purchase_note || '',
      store_suggestion_id: item.store_suggestion_id || '',
      image_url: item.image_url || '',
      max_price: item.max_price || '',
      product_code: item.product_code || ''
    })
    setShowAddModal(true)
  }

  const handleSaveItem = async (e) => {
    e.preventDefault(); if (!newItem.item_name) return alert('請輸入品項名稱')
    try {
      const payload = { 
        ...newItem, 
        store_suggestion_id: newItem.store_suggestion_id || null,
        max_price: newItem.max_price ? parseInt(newItem.max_price) : null
      }
      if (isEditingItem) {
        const { error } = await supabase.from('shopping_list').update(payload).eq('id', editingItemId)
        if (error) throw error
        alert('更新成功！')
      } else {
        const { error } = await supabase.from('shopping_list').insert([payload])
        if (error) throw error
        alert('新增成功！')
      }
      setShowAddModal(false)
      setIsEditingItem(false)
      setNewItem({ item_name: '', category: '保暖層', quantity: 1, requester_ids: [profiles[0]?.id], size: '', color: '', purchase_note: '', store_suggestion_id: '', image_url: '', max_price: '', product_code: '' })
      fetchAllData()
    } catch (error) { alert('操作失敗: ' + error.message) }
  }

  const openEditStoreModal = (store) => {
    setIsEditingStore(true)
    setEditingStoreId(store.id)
    setNewStore({
      name: store.name || '',
      category: store.category || '戶外用品',
      address: store.address || '',
      google_map_link: store.google_map_link || '',
      buying_tips: store.buying_tips || '',
      plan_day: store.plan_day || 'Day 1',
      lat: store.lat || '', 
      lng: store.lng || ''  
    })
    setShowAddStoreModal(true)
  }

  const handleSaveStore = async (e) => {
    e.preventDefault(); if (!newStore.name) return alert('請輸入店名')
    try {
      const payload = {
        ...newStore,
        lat: newStore.lat ? parseFloat(newStore.lat) : null,
        lng: newStore.lng ? parseFloat(newStore.lng) : null
      }
      if (isEditingStore) {
        const { error } = await supabase.from('stores').update(payload).eq('id', editingStoreId)
        if (error) throw error
        alert('商店更新成功！')
      } else {
        const { error } = await supabase.from('stores').insert([payload])
        if (error) throw error
        alert('商店新增成功！')
      }
      setShowAddStoreModal(false)
      setShowAssignModal(false)
      setIsEditingStore(false)
      setEditingStoreId(null)
      setNewStore({ name: '', category: '戶外用品', address: '', google_map_link: '', buying_tips: '', plan_day: '', lat: '', lng: '' })
      fetchAllData(); 
    } catch (error) { alert('操作失敗') }
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

  const startEditMeasurement = (m) => {
    setEditMeasure({ ...m }) 
    setIsEditingSize(true)
  }

  const saveMeasurement = async () => {
    try {
      const { error } = await supabase.from('measurements').update({
        height: editMeasure.height,
        waist: editMeasure.waist,
        hip: editMeasure.hip,
        leg_length: editMeasure.leg_length,
        foot_length: editMeasure.foot_length,
        arm_length: editMeasure.arm_length
      }).eq('id', editMeasure.id)
      if (error) throw error
      setIsEditingSize(false)
      fetchAllData()
      alert('尺寸更新成功！')
    } catch (error) { alert('更新失敗') }
  }

  // --- [V26] 記帳相關邏輯 ---

  // 上傳圖片到 Supabase Storage
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      // 1. 產生不重複檔名
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // 2. 上傳
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. 取得公開網址
      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
      
      // 4. 更新 State
      setNewExpense(prev => ({ ...prev, receipt_url: data.publicUrl }))
      
    } catch (error) {
      alert('圖片上傳失敗：' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  // 儲存記帳
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.amount) return alert('請輸入金額')

    try {
      const { error } = await supabase.from('expenses').insert([{
        amount: parseInt(newExpense.amount),
        store_name: newExpense.store_name,
        category: newExpense.category,
        note: newExpense.note,
        receipt_url: newExpense.receipt_url
      }])
      
      if (error) throw error
      
      alert('記帳成功！')
      setShowExpenseModal(false)
      setNewExpense({ amount: '', store_name: '', category: '購物', note: '', receipt_url: '' })
      fetchAllData() // 刷新列表
    } catch (error) {
      alert('儲存失敗：' + error.message)
    }
  }

  const handleDeleteExpense = async (id) => {
    if(!confirm('確定要刪除這筆紀錄嗎？')) return
    try {
        const { error } = await supabase.from('expenses').delete().eq('id', id)
        if(error) throw error
        setExpenses(expenses.filter(e => e.id !== id))
    } catch(error) { alert('刪除失敗') }
  }

  // Helpers
  const formatPrice = (price) => price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : '';
  const displayItems = items.filter(item => activeTab === 'todo' ? !item.is_purchased : item.is_purchased)
  
  const renderRequesters = (ids) => {
    if (!ids || ids.length === 0) return null
    return (
      <div className="flex gap-1 flex-wrap">
        {ids.map(id => {
          const p = profiles.find(p => p.id === id)
          if (!p) return null
          return (
            <span key={id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border bg-gray-100 text-gray-600 border-gray-200`}>
              {p.nickname}
            </span>
          )
        })}
      </div>
    )
  }

  // 計算總花費
  const totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0)

  if (loading) return <div className="flex h-screen items-center justify-center text-xl text-ruri animate-pulse">載入中...</div>

  return (
    <div className="min-h-screen bg-gofun pb-32 font-sans text-sumi">
      
      {/* 頂部固定區塊 */}
      <div className="sticky top-0 z-30 shadow-md">
        <header className="bg-ruri text-white p-4">
          <h1 className="text-lg font-bold text-center tracking-widest flex items-center justify-center gap-2">
             <ShoppingCart className="w-5 h-5" /> 東京採購特攻隊
          </h1>
          <div className="flex justify-between text-xs mt-3 px-2 opacity-90 font-light">
            <span className="flex items-center gap-1"><Store className="w-3 h-3"/> 12/19 - 12/23</span>
            <span>進度: {items.filter(i => i.is_purchased).length}/{items.length}</span>
          </div>
        </header>

        <div className="flex bg-white/95 backdrop-blur-sm overflow-x-auto border-b border-gray-100 no-scrollbar">
          <TabButton icon={<ClipboardList size={18}/>} label="待購" active={activeTab === 'todo'} onClick={() => setActiveTab('todo')} color="ruri" />
          <TabButton icon={<CheckCircle2 size={18}/>} label="完成" active={activeTab === 'done'} onClick={() => setActiveTab('done')} color="green" />
          <TabButton icon={<CalendarDays size={18}/>} label="攻略" active={activeTab === 'strategy'} onClick={() => setActiveTab('strategy')} color="red" />
          <TabButton icon={<Store size={18}/>} label="店家" active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} color="orange" />
          <TabButton icon={<Plane size={18}/>} label="資訊" active={activeTab === 'info'} onClick={() => setActiveTab('info')} color="purple" />
        </div>
      </div>

      <main className="p-3 space-y-3">
        {/* VIEW: Shopping List */}
        {(activeTab === 'todo' || activeTab === 'done') && (
          <>
            {displayItems.length === 0 && <div className="text-center text-gray-400 py-20 text-sm">無項目</div>}
            {displayItems.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col transition-all overflow-hidden ${item.is_purchased ? 'opacity-60 grayscale' : ''}`}>
                <div className="p-3 flex gap-3 relative">
                  <div 
                    className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-100 relative cursor-zoom-in active:scale-95 transition-transform"
                    onClick={() => item.image_url ? setPreviewImage(item.image_url) : null}
                  >
                     {item.image_url ? (
                       <>
                         <img src={item.image_url} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                         <div className="absolute bottom-0 right-0 bg-black/50 text-white p-0.5 rounded-tl-md"><ZoomIn size={10} /></div>
                       </>
                     ) : (
                       <ShoppingBag className="text-gray-300 w-8 h-8" />
                     )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      {renderRequesters(item.requester_ids)}
                      <div className="flex gap-1 ml-auto shrink-0 pl-2">
                         {item.stores?.name && <span className="text-[10px] text-ruri bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded truncate max-w-[80px] flex items-center gap-0.5"><MapPin size={8} />{item.stores.name}</span>}
                         <span className="text-[10px] text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">{item.category}</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-sumi text-base leading-tight mb-1">{item.item_name}</h3>
                    {item.product_code && <div className="flex items-center gap-1 text-xs text-gray-400 font-mono mb-1"><Barcode size={10}/> {item.product_code}</div>}
                    <div className="text-xs text-gray-500 mt-auto flex flex-wrap gap-2 items-center">
                      {item.size && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Shirt size={10}/> {item.size}</span>}
                      {item.color && <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"><Palette size={10}/> {item.color}</span>}
                      <span className="text-sumi font-bold bg-gray-100 px-1.5 rounded">x{item.quantity}</span>
                      {item.max_price && <span className="text-karakurenai font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5"><Coins size={10} /> ¥{formatPrice(item.max_price)}</span>}
                    </div>
                  </div>
                </div>
                {item.purchase_note && <div className="px-3 pb-2 text-xs text-gray-400 italic">📝 {item.purchase_note}</div>}
                <div className="border-t border-gray-100 p-2 flex items-center gap-2 bg-gray-50/50">
                   <button onClick={() => togglePurchase(item.id, item.is_purchased)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] shadow-sm ${item.is_purchased ? 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100' : 'bg-ruri text-white border border-ruri hover:bg-ruri-light'}`}>
                      {item.is_purchased ? <RotateCcw size={16}/> : <CheckCircle2 size={16}/>}
                      {item.is_purchased ? '恢復未購 (Undo)' : '標示已購 (Done)'}
                   </button>
                   {!item.is_purchased && (<><button onClick={() => openEditModal(item)} className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-gray-500 border border-gray-200 active:scale-95 transition-all shadow-sm"><Edit size={18} /></button><button onClick={() => handleDelete(item.id)} className="w-11 h-11 flex items-center justify-center rounded-lg bg-white text-karakurenai border border-red-100 active:scale-95 transition-all shadow-sm"><Trash2 size={18} /></button></>)}
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

        {/* VIEW: Stores */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
             <div className="flex justify-center mb-4">
               <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                 <button onClick={() => setStoreViewMode('list')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${storeViewMode === 'list' ? 'bg-white shadow-sm text-ruri' : 'text-gray-400 hover:text-gray-600'}`}>
                   <List size={16}/> 列表模式
                 </button>
                 <button onClick={() => setStoreViewMode('map')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${storeViewMode === 'map' ? 'bg-white shadow-sm text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
                   <MapIcon size={16}/> 地圖模式
                 </button>
               </div>
             </div>

             {storeViewMode === 'list' && stores.map(store => (
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
                    <button onClick={() => openEditStoreModal(store)} className="w-12 flex items-center justify-center bg-gray-50 text-gray-500 rounded-xl border border-gray-200 active:scale-95 transition-all"><Edit size={20} /></button>
                    <button onClick={() => handleDeleteStore(store.id)} className="w-12 flex items-center justify-center bg-red-50 text-karakurenai rounded-xl border border-red-100 active:scale-95 transition-all"><Trash2 size={20} /></button>
                  </div>
               </div>
             ))}

             {storeViewMode === 'map' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[60vh] relative z-0">
                   <MapContainer center={[35.6812, 139.7671]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />
                      {stores.filter(s => s.lat && s.lng).map(store => (
                        <Marker key={store.id} position={[store.lat, store.lng]}>
                          <Popup minWidth={200}>
                            <div className="font-sans">
                              <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-1">
                                <strong className="text-sm text-sumi">{store.name}</strong>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${store.plan_day ? 'bg-ruri text-white' : 'bg-gray-200 text-gray-500'}`}>
                                  {store.plan_day || '未排'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mb-3 space-y-1">
                                <p>{store.category}</p>
                                {store.buying_tips ? <p className="text-orange-600 bg-orange-50 p-1 rounded">💡 {store.buying_tips}</p> : <p className="italic text-gray-300">無採購筆記</p>}
                              </div>
                              <div className="flex gap-2">
                                {store.google_map_link && <a href={store.google_map_link} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 py-1.5 rounded text-xs font-bold no-underline hover:bg-blue-100"><Navigation size={12} className="mr-1"/> 導航</a>}
                                <button onClick={() => openEditStoreModal(store)} className="flex-1 flex items-center justify-center bg-gray-50 text-gray-600 border border-gray-200 py-1.5 rounded text-xs font-bold hover:bg-gray-100"><Edit size={12} className="mr-1"/> 編輯</button>
                                <button onClick={() => handleDeleteStore(store.id)} className="w-8 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 py-1.5 rounded hover:bg-red-100"><Trash2 size={12}/></button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                   </MapContainer>
                </div>
             )}
          </div>
        )}

        {/* VIEW: Info & Wallet [V26] */}
        {activeTab === 'info' && (
          <div className="space-y-4 pb-10">
            {/* [V26] Wallet Dashboard */}
            <div className="bg-gradient-to-r from-sumi to-gray-800 rounded-xl shadow-md p-5 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120}/></div>
                <h3 className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-2"><Wallet size={14}/> 累計花費 (Total Spending)</h3>
                <div className="text-4xl font-bold font-mono tracking-tight mb-4">
                   ¥ {formatPrice(totalExpense)}
                </div>
                <button onClick={() => setShowExpenseModal(true)} className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
                    <Camera size={16}/> 掃描收據 / 記一筆
                </button>
            </div>

            {/* [V26] Recent Expenses List */}
            {expenses.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <h3 className="font-bold text-sm text-sumi mb-3 flex items-center justify-between">
                        <span>最近消費紀錄</span>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{expenses.length} 筆</span>
                    </h3>
                    <div className="space-y-3">
                        {expenses.map(exp => (
                            <div key={exp.id} className="flex gap-3 items-center border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100 cursor-pointer" onClick={() => exp.receipt_url && setPreviewImage(exp.receipt_url)}>
                                    {exp.receipt_url ? <img src={exp.receipt_url} className="w-full h-full object-cover"/> : <Wallet size={20} className="text-gray-300"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <div className="font-bold text-sumi truncate">{exp.store_name || '未知名稱'}</div>
                                        <div className="font-mono font-bold text-sumi">¥{formatPrice(exp.amount)}</div>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="text-xs text-gray-500">{exp.category} · {new Date(exp.created_at).toLocaleDateString()}</div>
                                        <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                                    </div>
                                    {exp.note && <div className="text-xs text-gray-400 mt-1 italic">{exp.note}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Static Info (Flight, etc.) */}
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-ruri p-4"><h3 className="text-base font-bold text-ruri flex items-center gap-2 mb-3"><Plane className="rotate-45" size={20} /> 去程 (MM620)</h3><div className="text-sm text-gray-600 space-y-2"><div className="flex justify-between items-center font-bold text-sumi text-lg"><span>02:25 桃園</span><span className="text-gray-300">➔</span><span>06:30 成田</span></div><div className="bg-red-50 text-karakurenai px-3 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5"><AlertCircle size={14}/> 01:35 關櫃</div></div></div>
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-orange-400 p-4"><h3 className="text-base font-bold text-orange-600 flex items-center gap-2 mb-2"><Hotel size={20} /> 飯店資訊</h3><p className="font-bold text-sumi text-lg">Hotel LiVEMAX Kayabacho</p><p className="text-sm text-gray-500 mt-1 flex gap-1"><MapPin size={14} className="mt-0.5"/> 〒103-0025 東京都中央区日本橋茅場町3-7-3</p><div className="mt-4"><a href="https://www.google.com/maps/dir/?api=1&destination=Hotel+LiVEMAX+Kayabacho" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-orange-50 text-orange-600 py-3 rounded-xl font-bold border border-orange-100 hover:bg-orange-100 transition-colors shadow-sm"><MapPin size={18} /> 帶我去飯店</a></div></div>
            <div className="bg-white rounded-xl shadow-sm border-l-[6px] border-gray-400 p-4"><h3 className="text-base font-bold text-gray-700 flex items-center gap-2 mb-4"><Train size={20} /> 機場交通 (成田 ⮂ 茅場町)</h3><div className="space-y-6"><div className="border-b border-gray-100 pb-4"><div className="flex justify-between items-center mb-1"><span className="font-bold text-sumi flex items-center gap-1.5"><Train size={16} className="text-gray-400"/> 方案 A：京成 Access</span><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono">¥1,400</span></div><p className="text-xs text-gray-500 leading-relaxed mb-3">成田機場 ➔ Access 特急 (往羽田) ➔ <strong>日本橋站</strong> 下車 ➔ 走路 8 分鐘。</p><a href="https://www.google.com/maps/dir/?api=1&origin=Narita+International+Airport&destination=Hotel+LiVEMAX+Kayabacho&travelmode=transit" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"><Navigation size={18} /> 導航：機場 ➔ 飯店 (鐵路)</a></div><div><div className="flex justify-between items-center mb-1"><span className="font-bold text-sumi flex items-center gap-1.5"><Bus size={16} className="text-gray-400"/> 方案 B：利木津巴士</span><span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-mono">¥2,800</span></div><p className="text-xs text-gray-500 leading-relaxed mb-3">成田機場 ➔ 利木津巴士往「T-CAT」 ➔ T-CAT (水天宮前站) ➔ 走路 10 分鐘到飯店。</p><a href="https://www.google.com/maps/dir/?api=1&origin=Narita+Airport&destination=Tokyo+City+Air+Terminal&travelmode=transit" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"><Navigation size={18} /> 導航：機場 ➔ 飯店 (巴士優先)</a></div></div></div>
          </div>
        )}
      </main>

      {(activeTab === 'todo' || activeTab === 'done' || activeTab === 'stores') && (
        <button onClick={() => { 
            setIsEditingItem(false); 
            setNewItem({...newItem, requester_ids: [profiles[0]?.id]});
            if (activeTab === 'stores') {
               setIsEditingStore(false);
               setNewStore({ name: '', category: '戶外用品', address: '', google_map_link: '', buying_tips: '', plan_day: '', lat: '', lng: '' });
               setShowAddStoreModal(true);
            } else {
               setShowAddModal(true); 
            }
          }}
          className={`fixed bottom-24 right-5 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center active:scale-95 transition-all z-30 ${activeTab === 'stores' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-ruri hover:bg-ruri-light'}`}>
          <Plus size={32} strokeWidth={2.5} />
        </button>
      )}

      {/* Footer (Updated Camera Button) */}
      <footer className="fixed bottom-0 w-full bg-kon-kikyo text-gray-400 border-t border-gray-800 p-2 pb-5 flex justify-around z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <NavButton icon={<ClipboardList size={22} />} label="清單" active={activeTab === 'todo'} onClick={() => { setActiveTab('todo'); setShowAddModal(false); }} />
        <button className="flex flex-col items-center justify-center bg-white text-ruri w-14 h-14 rounded-full -mt-8 shadow-xl border-4 border-gofun relative z-10 active:scale-95 transition-transform" onClick={() => setShowSizeModal(true)}>
          <Shirt size={28} strokeWidth={2} />
        </button>
        {/* [V26] Updated Camera Action */}
        <NavButton icon={<Camera size={22} />} label="記帳" active={activeTab === 'info'} onClick={() => setShowExpenseModal(true)} />
      </footer>

      {previewImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-2" onClick={() => setPreviewImage(null)}><X size={32}/></button>
        </div>
      )}

      {/* [V26] Expense Modal (Wallet) */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-kon-kikyo/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-sumi p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2"><Wallet size={20}/> 新增消費</h3>
              <button onClick={() => setShowExpenseModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
                
                {/* 1. 上傳收據區塊 */}
                <div className="flex justify-center mb-2">
                    <label className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${newExpense.receipt_url ? 'border-ruri bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}>
                        {isUploading ? (
                             <div className="flex flex-col items-center text-ruri animate-pulse"><Loader2 size={30} className="animate-spin mb-2"/><span className="text-xs font-bold">上傳中...</span></div>
                        ) : newExpense.receipt_url ? (
                             <>
                                <img src={newExpense.receipt_url} className="w-full h-full object-cover opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white font-bold text-xs opacity-0 hover:opacity-100 transition-opacity">點擊更換照片</div>
                             </>
                        ) : (
                             <div className="text-gray-400 flex flex-col items-center"><ImagePlus size={30} className="mb-2"/><span className="text-xs font-bold">點此拍收據 / 選照片</span></div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} disabled={isUploading}/>
                    </label>
                </div>

                {/* 2. 金額 (大字) */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">金額 (¥)</label>
                    <input type="number" placeholder="0" className="w-full border-b-2 border-gray-200 p-2 text-3xl font-mono font-bold text-center text-sumi outline-none focus:border-ruri bg-transparent" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} autoFocus />
                </div>

                {/* 3. 店家 (可選現有) */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">店家</label>
                    <div className="flex gap-2">
                         <select className="w-1/3 border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-xs" onChange={e => setNewExpense({...newExpense, store_name: e.target.value})}>
                            <option value="">(快速選)</option>
                            {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                         </select>
                         <input type="text" placeholder="輸入店名..." className="flex-1 border border-gray-200 p-2.5 rounded-lg text-sm outline-none" value={newExpense.store_name} onChange={e => setNewExpense({...newExpense, store_name: e.target.value})} />
                    </div>
                </div>

                {/* 4. 類別 & 備註 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">類別</label>
                        <select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                            <option value="購物">購物</option>
                            <option value="餐飲">餐飲</option>
                            <option value="交通">交通</option>
                            <option value="住宿">住宿</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">備註</label>
                         <input type="text" placeholder="..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newExpense.note} onChange={e => setNewExpense({...newExpense, note: e.target.value})} />
                    </div>
                </div>

                <button type="submit" disabled={isUploading} className="w-full bg-sumi text-white py-3.5 rounded-xl font-bold shadow-lg mt-2 active:scale-[0.98] disabled:opacity-50">
                    確認記帳 (Save)
                </button>
            </form>
          </div>
        </div>
      )}

      {/* ... (Keep SizeModal & AddStoreModal code as is, they are already at the bottom) ... */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-kon-kikyo/90 backdrop-blur-sm z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md mx-auto h-[90vh] sm:h-auto flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-bold text-lg text-sumi flex items-center gap-2"><Shirt size={20} className="text-ruri"/> 身形尺寸卡</h2>
              <div className="flex gap-2">
                {!isEditingSize && (
                  <button onClick={() => { 
                    const m = measurements.find(m => m.profiles.id === selectedMemberId); 
                    if(m) startEditMeasurement(m); 
                  }} className="text-ruri hover:bg-blue-50 p-2 rounded-full transition-colors flex items-center gap-1 text-xs font-bold border border-ruri/20">
                    <Edit size={14}/> Edit
                  </button>
                )}
                {isEditingSize && (
                  <button onClick={saveMeasurement} className="bg-ruri text-white p-2 rounded-full transition-colors flex items-center gap-1 text-xs font-bold shadow-md">
                    <Save size={14}/> Save
                  </button>
                )}
                <button onClick={() => setShowSizeModal(false)} className="text-gray-400 hover:text-sumi p-1 bg-white rounded-full border border-gray-200"><X size={20}/></button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 p-3 border-b border-gray-100 bg-white">
              {measurements.map(m => (
                <button key={m.id} onClick={() => { setSelectedMemberId(m.profiles.id); setIsEditingSize(false); }} className={`py-2 rounded-lg text-xs font-bold transition-all truncate ${selectedMemberId === m.profiles.id ? 'bg-ruri text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{m.profiles.english_name}</button>
              ))}
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-white flex flex-col items-center">
              {measurements.filter(m => m.profiles.id === selectedMemberId).map(m => (
                <div key={m.id} className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex flex-row gap-4 items-start">
                    <div className="w-1/2"><BodyVisualWithFists /></div>
                    <div className="w-1/2 flex flex-col gap-2">
                      {isEditingSize ? (
                        <div className="space-y-2">
                          {['height', 'arm_length', 'waist', 'hip', 'leg_length', 'foot_length'].map(field => (
                            <div key={field} className="flex flex-col">
                              <label className="text-[10px] uppercase text-gray-400 font-bold">{field.replace('_', ' ')}</label>
                              <input type="number" className="border p-1 rounded font-bold text-sumi" value={editMeasure[field]} onChange={e => setEditMeasure({...editMeasure, [field]: e.target.value})} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <SizeRow num="1" label="身長" jp="Height" val={m.height} />
                          <SizeRow num="2" label="袖丈" jp="Arm" val={m.arm_length} highlight />
                          <SizeRow num="3" label="ウエスト" jp="Waist" val={m.waist} />
                          <SizeRow num="4" label="ヒップ" jp="Hip" val={m.hip} />
                          <SizeRow num="5" label="総丈" jp="Leg" val={m.leg_length} highlight />
                          <SizeRow num="6" label="足" jp="Foot" val={m.foot_length} />
                        </>
                      )}
                    </div>
                  </div>
                  {!isEditingSize && m.profiles.color_pref && <div className="mt-4 text-center"><span className="text-xs text-gray-400">偏好色系</span><div className="text-ruri font-bold text-lg">{m.profiles.color_pref}</div></div>}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50"><button onClick={() => setShowSizeModal(false)} className="w-full py-3.5 bg-sumi text-white rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform">關閉 (Close)</button></div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center rounded-t-2xl"><h3 className="font-bold text-lg flex items-center gap-2"><CalendarDays size={20}/> 排入 {targetDay}</h3><button onClick={() => setShowAssignModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button></div><div className="p-5 space-y-4"><p className="text-sm text-gray-500">請選擇已經建立的商店，將其移動到這一天。</p><div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">選擇商店</label><select className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 text-base outline-none" value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)}><option value="">-- 請選擇 --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.plan_day ? `(目前在 ${s.plan_day})` : ''}</option>)}</select></div><button onClick={handleAssignStore} className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold shadow-lg mt-2 active:scale-[0.98]">確認排入 (Assign)</button><div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-300 text-xs">或</span><div className="flex-grow border-t border-gray-200"></div></div><button onClick={() => setShowAddStoreModal(true)} className="w-full bg-white text-orange-500 border border-orange-200 py-3 rounded-xl font-bold text-sm active:scale-[0.98]">建立新商店並排入...</button></div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-ruri p-4 text-white flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {isEditingItem ? <Edit size={20}/> : <Plus size={20}/>} 
                {isEditingItem ? '編輯願望' : '新增願望'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Requesters (多選)</label>
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                  {profiles.map(p => {
                    const isSelected = newItem.requester_ids?.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => toggleRequester(p.id)} className={`px-4 py-2 rounded-lg border text-sm flex-shrink-0 transition-all ${isSelected ? 'bg-blue-50 border-ruri text-ruri font-bold ring-1 ring-ruri' : 'border-gray-200 text-gray-500'}`}>
                        {p.nickname}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                 <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Store</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm outline-none" value={newItem.store_suggestion_id} onChange={e => setNewItem({...newItem, store_suggestion_id: e.target.value})}><option value="">不指定</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Item Name</label><input type="text" placeholder="例如：發熱襪" className="w-full border border-gray-200 p-2.5 rounded-lg text-base outline-none" value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Product Code</label><input type="text" placeholder="Uniqlo No. 123456" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none font-mono" value={newItem.product_code} onChange={e => setNewItem({...newItem, product_code: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Budget (¥)</label><input type="number" placeholder="預算上限" className="w-full border border-gray-200 p-2.5 rounded-lg text-base outline-none text-karakurenai font-bold" value={newItem.max_price} onChange={e => setNewItem({...newItem, max_price: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Image URL</label><input type="text" placeholder="https://..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm outline-none" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Qty</label><input type="number" min="1" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Size</label><input type="text" placeholder="L" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.size} onChange={e => setNewItem({...newItem, size: e.target.value})} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Color</label><input type="text" placeholder="紅" className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.color} onChange={e => setNewItem({...newItem, color: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Note</label><input type="text" placeholder="備註..." className="w-full border border-gray-200 p-2.5 rounded-lg" value={newItem.purchase_note} onChange={e => setNewItem({...newItem, purchase_note: e.target.value})} /></div>
              <button type="submit" className="w-full bg-ruri text-white py-3.5 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-transform mt-2">
                {isEditingItem ? '更新資料 (Update)' : '確認新增 (Add)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddStoreModal && (
        <div className="fixed inset-0 bg-kon-kikyo/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-orange-500 p-4 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {isEditingStore ? <Edit size={20}/> : <Store size={20}/>} 
                {isEditingStore ? '編輯店家' : '新增店家'}
              </h3>
              <button onClick={() => setShowAddStoreModal(false)} className="opacity-80 hover:opacity-100"><X size={24}/></button>
            </div>
            <form onSubmit={handleSaveStore} className="p-5 space-y-4">
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Name</label><input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg outline-none" value={newStore.name} onChange={e => setNewStore({...newStore, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm" value={newStore.category} onChange={e => setNewStore({...newStore, category: e.target.value})}><option value="戶外用品">戶外用品</option><option value="機能服飾">機能服飾</option><option value="生活雜貨">生活雜貨</option><option value="藥妝">藥妝</option><option value="其他">其他</option></select></div>
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Visit Day</label><select className="w-full border border-gray-200 p-2.5 rounded-lg bg-gray-50 text-sm font-bold text-orange-600" value={newStore.plan_day} onChange={e => setNewStore({...newStore, plan_day: e.target.value})}><option value="Day 1">Day 1</option><option value="Day 2">Day 2</option><option value="Day 3">Day 3</option><option value="Day 4">Day 4</option><option value="Day 5">Day 5</option></select></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Address</label><input type="text" className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.address} onChange={e => setNewStore({...newStore, address: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Lat</label><input type="number" placeholder="35.689..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.lat} onChange={e => setNewStore({...newStore, lat: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Lng</label><input type="number" placeholder="139.691..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.lng} onChange={e => setNewStore({...newStore, lng: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Map Link</label><input type="text" placeholder="https://..." className="w-full border border-gray-200 p-2.5 rounded-lg text-sm" value={newStore.google_map_link} onChange={e => setNewStore({...newStore, google_map_link: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Tips</label><textarea className="w-full border border-gray-200 p-2.5 rounded-lg h-20 text-sm resize-none" value={newStore.buying_tips} onChange={e => setNewStore({...newStore, buying_tips: e.target.value})} /></div>
              <button type="submit" className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold shadow-lg mt-2">{isEditingStore ? '確認更新 (Update)' : '新增商店 (Add)'}</button>
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
      <line x1="20" y1="15" x2="20" y2="380" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrow)" />
      <circle cx="20" cy="200" r="8" fill="#1E50A2" />
      <text x="20" y="204" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">1</text>
      <line x1="125" y1="75" x2="160" y2="180" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="150" cy="120" r="8" fill="#1E50A2" />
      <text x="150" y="124" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">2</text>
      <line x1="75" y1="150" x2="125" y2="150" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="100" cy="150" r="8" fill="#1E50A2" />
      <text x="100" y="154" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">3</text>
      <line x1="75" y1="180" x2="125" y2="180" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" />
      <circle cx="100" cy="180" r="8" fill="#1E50A2" />
      <text x="100" y="184" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">4</text>
      <line x1="165" y1="150" x2="165" y2="380" stroke="#1E50A2" strokeWidth="1" strokeDasharray="4" markerEnd="url(#arrow)" />
      <circle cx="165" cy="265" r="8" fill="#1E50A2" />
      <text x="165" y="269" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">5</text>
      <line x1="60" y1="390" x2="100" y2="390" stroke="#1E50A2" strokeWidth="1" />
      <circle cx="80" cy="390" r="8" fill="#1E50A2" />
      <text x="80" y="394" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">6</text>
    </svg>
  )
}

export default App