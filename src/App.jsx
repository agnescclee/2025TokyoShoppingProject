import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function App() {
  // --- 資料狀態 ---
  const [items, setItems] = useState([])
  const [measurements, setMeasurements] = useState([]) // [NEW] 身形資料
  const [loading, setLoading] = useState(true)
  
  // --- UI 狀態 ---
  const [activeTab, setActiveTab] = useState('todo') // 'todo' | 'done'
  const [showSizeModal, setShowSizeModal] = useState(false) // [NEW] 控制尺寸卡開關
  const [selectedMemberId, setSelectedMemberId] = useState(null) // [NEW] 目前顯示誰的尺寸

  // 初始化
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // 1. 抓取購物清單
      const { data: listData, error: listError } = await supabase
        .from('shopping_list')
        .select(`*, profiles (nickname, color_pref)`)
        .order('created_at', { ascending: false })
      if (listError) throw listError
      setItems(listData)

      // 2. [NEW] 抓取身形資料
      const { data: measureData, error: measureError } = await supabase
        .from('measurements')
        .select(`*, profiles (id, nickname, english_name, color_pref)`)
      if (measureError) throw measureError
      
      // 整理資料排序 (讓爸爸/寬排第一個，或是依照習慣排序)
      // 這裡簡單依照 nickname 排序，實務上可自訂
      setMeasurements(measureData)
      if (measureData.length > 0) {
        setSelectedMemberId(measureData[0].profiles.id)
      }

    } catch (error) {
      console.error('Error:', error.message)
      alert('讀取資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const togglePurchase = async (id, currentStatus) => {
    // (同之前的邏輯：樂觀更新 + 寫入資料庫)
    try {
      setItems(items.map(item => item.id === id ? { ...item, is_purchased: !currentStatus } : item))
      await supabase.from('shopping_list').update({ is_purchased: !currentStatus }).eq('id', id)
    } catch (error) {
      alert('更新失敗')
      fetchAllData()
    }
  }

  // 篩選清單
  const displayItems = items.filter(item => activeTab === 'todo' ? !item.is_purchased : item.is_purchased)

  // 輔助：顏色樣式
  const getBadgeColor = (nickname) => {
    const map = {
      '寬': 'bg-gray-200 text-gray-800',
      '涵': 'bg-purple-100 text-purple-800',
      '蓉': 'bg-red-100 text-red-800',
      '旂': 'bg-yellow-100 text-yellow-800',
      '宇': 'bg-teal-100 text-teal-800',
    }
    return map[nickname] || 'bg-blue-100 text-blue-800'
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-xl text-gray-500">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">
      
      {/* --- 頂部 --- */}
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-20 shadow-lg">
        <h1 className="text-xl font-bold text-center tracking-wider">東京採購特攻隊 🇯🇵</h1>
        <div className="flex justify-between text-xs mt-2 px-4 opacity-90">
          <span>📅 12/19 - 12/23</span>
          <span>進度: {items.filter(i => i.is_purchased).length}/{items.length}</span>
        </div>
      </header>

      {/* --- 頁籤 --- */}
      <div className="flex bg-white shadow-sm sticky top-[76px] z-10">
        <button onClick={() => setActiveTab('todo')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'todo' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
          待採購
        </button>
        <button onClick={() => setActiveTab('done')} className={`flex-1 py-3 font-bold text-sm ${activeTab === 'done' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-400'}`}>
          已完成
        </button>
      </div>

      {/* --- 購物列表 --- */}
      <main className="p-3 space-y-3">
        {displayItems.length === 0 && (
          <div className="text-center text-gray-400 py-10 text-sm">沒有項目</div>
        )}

        {displayItems.map((item) => (
          <div key={item.id} className={`bg-white rounded-lg shadow-sm border p-3 flex gap-3 ${item.is_purchased ? 'opacity-60 grayscale' : ''}`}>
            {/* 圖片 */}
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
               {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : <span className="text-xl">🛍️</span>}
            </div>
            
            {/* 資訊 */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getBadgeColor(item.profiles?.nickname)}`}>
                  {item.profiles?.nickname}
                </span>
                <span className="text-[10px] text-gray-500 border px-1 rounded">{item.category}</span>
              </div>
              <h3 className="font-bold text-gray-800 text-base truncate">{item.item_name}</h3>
              
              {item.product_code && (
                <div className="text-xs text-yellow-700 font-mono bg-yellow-50 px-1 inline-block rounded mt-1">
                  No. {item.product_code}
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-1 flex justify-between items-end">
                <span>{item.color} / {item.size}</span>
                <span className="text-black font-bold text-sm">x{item.quantity}</span>
              </div>
            </div>

            {/* Checkbox */}
            <div className="flex items-center pl-2 border-l">
              <input type="checkbox" checked={item.is_purchased} onChange={() => togglePurchase(item.id, item.is_purchased)} className="w-6 h-6" />
            </div>
          </div>
        ))}
      </main>

      {/* --- 底部導航 --- */}
      <footer className="fixed bottom-0 w-full bg-white border-t p-2 pb-4 flex justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-30">
        <button className="flex flex-col items-center text-blue-600 w-16" onClick={() => setShowSizeModal(false)}>
          <span className="text-xl">📝</span>
          <span className="text-[10px]">清單</span>
        </button>
        
        {/* [NEW] 尺寸卡按鈕 - 特別做大一點 */}
        <button 
          className="flex flex-col items-center justify-center bg-blue-600 text-white w-14 h-14 rounded-full -mt-6 shadow-lg border-4 border-gray-50"
          onClick={() => setShowSizeModal(true)}
        >
          <span className="text-2xl">👕</span>
        </button>
        
        <button className="flex flex-col items-center text-gray-400 w-16" onClick={() => alert('之後再做收據功能')}>
          <span className="text-xl">📷</span>
          <span className="text-[10px]">掃描</span>
        </button>
      </footer>

      {/* --- [NEW] 尺寸卡 Modal (彈出視窗) --- */}
      {showSizeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto h-[85vh] sm:h-auto flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <h2 className="font-bold text-lg text-gray-700">📏 身形尺寸卡 (Size Card)</h2>
              <button onClick={() => setShowSizeModal(false)} className="text-gray-400 text-2xl font-bold">&times;</button>
            </div>

            {/* 成員切換 Tab */}
            <div className="flex overflow-x-auto p-2 gap-2 border-b hide-scrollbar">
              {measurements.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.profiles.id)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                    selectedMemberId === m.profiles.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {m.profiles.english_name}
                </button>
              ))}
            </div>

            {/* 尺寸內容顯示區 */}
            <div className="p-5 flex-1 overflow-y-auto">
              {measurements.filter(m => m.profiles.id === selectedMemberId).map(m => (
                <div key={m.id} className="space-y-6">
                  
                  {/* 給店員看的日文句子 */}
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">請出示給店員看</p>
                    <p className="text-lg font-bold text-gray-800">この人のサイズを探しています</p>
                    <p className="text-xs text-gray-400">(我在找這個人的尺寸)</p>
                  </div>

                  {/* 核心數據表格 */}
                  <div className="grid grid-cols-2 gap-4">
                    <MeasurementBox label="身高" jp="身長 (Height)" value={m.height} unit="cm" />
                    <MeasurementBox label="腰圍" jp="ウエスト (Waist)" value={m.waist} unit="cm" highlight />
                    <MeasurementBox label="臀圍" jp="ヒップ (Hip)" value={m.hip} unit="cm" />
                    <MeasurementBox label="腳長" jp="足のサイズ (Foot)" value={m.foot_length} unit="cm" />
                    <MeasurementBox label="腿長(腰到地)" jp="総丈 (Waist to Floor)" value={m.leg_length} unit="cm" />
                  </div>

                  {/* 備註 */}
                  {m.notes && (
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                      <span className="font-bold">⚠️ 注意事項：</span> {m.notes}
                    </div>
                  )}

                  {/* 色系偏好 */}
                  {m.profiles.color_pref && (
                    <div className="mt-2 text-center">
                      <span className="text-xs text-gray-400">偏好色系</span>
                      <div className="font-bold text-blue-600">{m.profiles.color_pref}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 關閉按鈕 */}
            <div className="p-4 border-t">
              <button 
                onClick={() => setShowSizeModal(false)}
                className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold active:scale-95 transition-transform"
              >
                關閉 / Close
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// 小元件：顯示單一數據格
function MeasurementBox({ label, jp, value, unit, highlight = false }) {
  return (
    <div className={`p-3 rounded-xl border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'} flex flex-col items-center justify-center text-center shadow-sm`}>
      <span className="text-xs text-gray-400 mb-0.5">{jp}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>
          {value || '-'}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      <span className="text-xs text-gray-500 font-medium mt-1">{label}</span>
    </div>
  )
}

export default App