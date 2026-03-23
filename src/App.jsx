import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, FileText, HeartPulse, Activity, Bone, Droplet, 
  Send, Settings, X, ChevronRight, Bot, User, AlertCircle, 
  CheckCircle, Plus, Info, Stethoscope, Utensils, Ban, ActivitySquare, Save,
  Sparkles, FileSearch, ShieldCheck, ArrowRight, Camera, Zap, MessageSquare,
  Smile, Calendar, UserRound, ClipboardList, AlertTriangle, Microscope, TestTube, Thermometer,
  BrainCircuit
} from 'lucide-react';

// --- CONFIGURATION & THEMES ---
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const THEMES = {
  'Blood Test': {
    accent: 'text-rose-500',
    bgAccent: 'bg-rose-100',
    border: 'border-rose-200',
    icon: Droplet
  },
  'Imaging / X-Ray': {
    accent: 'text-cyan-600',
    bgAccent: 'bg-cyan-100',
    border: 'border-cyan-200',
    icon: Bone
  },
  'Cardiology': {
    accent: 'text-rose-500',
    bgAccent: 'bg-rose-100',
    border: 'border-rose-200',
    icon: HeartPulse
  },
  'General': {
    accent: 'text-blue-600',
    bgAccent: 'bg-blue-100',
    border: 'border-blue-200',
    icon: Activity
  }
};

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY; // <--- PASTE YOUR GROQ API KEY HERE

// --- CUSTOM ANIMATIONS ---
const CustomStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(40px, -60px) scale(1.1); }
      66% { transform: translate(-30px, 30px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob {
      animation: blob 15s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    @keyframes float-subtle {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-float-subtle {
      animation: float-subtle 4s ease-in-out infinite;
    }
    @keyframes slide-in-left {
      from { opacity: 0; transform: translateX(-40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-left {
      animation: slide-in-left 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slide-in-right {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-slide-right {
      animation: slide-in-right 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .glass-panel {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
    }
    /* Custom Scrollbar for Chat */
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: rgba(156, 163, 175, 0.5);
      border-radius: 20px;
    }
  `}} />
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [appState, setAppState] = useState('UPLOAD'); // UPLOAD, ANALYZING, DASHBOARD
  const [reportText, setReportText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [theme, setTheme] = useState(THEMES['General']);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Process text with Groq AI
  const analyzeReport = async (textToAnalyze) => {
    if (!GROQ_API_KEY || GROQ_API_KEY === '') {
      setErrorMsg('API Key missing. Please open the code and paste your Groq API key into the GROQ_API_KEY variable.');
      return;
    }
    
    setAppState('ANALYZING');
    setErrorMsg('');
    setLoadingMsg('Connecting to our friendly AI doctor...');

    const systemPrompt = `You are a warm, extremely friendly, and empathetic medical AI assistant. You are analyzing a medical report for a non-medical person.
    CRITICAL INSTRUCTION: You MUST explain EVERYTHING in a casual, friendly tone. Avoid ALL complex medical jargon. Speak as if you are a friendly doctor explaining results to a patient in very simple language.
    
    Respond ONLY with a valid JSON object matching EXACTLY this structure:
    {
      "patientInfo": {
        "name": "Extract patient name if available, otherwise 'My Friend'",
        "age": "Extract age if available, otherwise 'Unknown'",
        "date": "Extract date if available, otherwise 'Recently'"
      },
      "reportType": "What kind of report is this? (e.g., Blood Test, X-Ray, General Health)",
      "healthSummary": "A friendly 3-4 sentence summary of the entire report. Highlight the most abnormal values, mention which parameters are normal, and suggest general health improvements. Example: 'Your report shows slightly elevated cholesterol... Most other things are normal...'",
      "keyFindings": [
        {
          "parameter": "Name of the issue/finding",
          "status": "Short description (e.g., 'High LDL Cholesterol – Needs attention')",
          "severity": "Normal" | "Mild Risk" | "Low / Moderate Concern" | "Severe Risk"
        }
      ],
      "parameterExplanations": [
        {
          "parameter": "Name of the thing tested (e.g., Hemoglobin)",
          "value": "The measured value as text (e.g., '10.2 g/dL')",
          "normalRange": "The normal range as text (e.g., '13.5 - 17.5 g/dL'). If unknown, write 'Not specified'",
          "isNumeric": true or false,
          "positionPercentage": A number from 0 to 100 representing where the value sits. 0-25 is low, 25-75 is normal range, 75-100 is high. (e.g., if it's perfectly in the middle of the normal range, put 50. If it's way below normal, put 10. If not numeric, put 50.),
          "severity": "Normal" | "Mild Risk" | "Low / Moderate Concern" | "Severe Risk",
          "explanation": "A friendly, simple explanation of what this is and what the result means. E.g., 'Your bad cholesterol is a bit high...'"
        }
      ],
      "dietPlan": [
        "Very specific, simple food instructions"
      ],
      "routinePlan": [
        "Very specific, simple daily activities"
      ],
      "thingsToAvoid": [
        "Simple things to stay away from"
      ]
    }`;

    try {
      setTimeout(() => setLoadingMsg('Reading your report carefully...'), 1500);
      setTimeout(() => setLoadingMsg('Making the confusing words super simple...'), 3500);
      setTimeout(() => setLoadingMsg('Writing your special health plan...'), 5500);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the medical report:\n\n${textToAnalyze}` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to connect to Groq API');
      }

      const data = await response.json();
      const resultJson = JSON.parse(data.choices[0].message.content);
      
      // Categorize theme based on report type string
      let matchedTheme = THEMES['General'];
      const rType = resultJson.reportType.toLowerCase();
      if (rType.includes('blood')) matchedTheme = THEMES['Blood Test'];
      else if (rType.includes('ray') || rType.includes('scan') || rType.includes('imaging')) matchedTheme = THEMES['Imaging / X-Ray'];
      else if (rType.includes('heart') || rType.includes('cardio') || rType.includes('ecg')) matchedTheme = THEMES['Cardiology'];
      
      setTheme(matchedTheme);
      setAnalysis(resultJson);
      
      // Initialize chat context
      setChatHistory([
        { role: 'assistant', content: `Hi there! I've analyzed your report and made everything easy to understand. I'm your personal health AI—ask me anything about your results, diet, or next steps!` }
      ]);
      
      setAppState('DASHBOARD');
    } catch (err) {
      console.error(err);
      setErrorMsg(`Analysis Failed: ${err.message}. Please check your API key and try again.`);
      setAppState('UPLOAD');
    }
  };

  return (
    <div className={`min-h-screen text-slate-800 bg-slate-50 font-sans relative overflow-x-hidden selection:bg-blue-200`}>
      <CustomStyles />
      
      {/* Light, Clean Medical Background Image & Gradients */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-cover bg-center opacity-[0.04] mix-blend-multiply filter blur-sm"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1551076805-e18690c5e531?auto=format&fit=crop&q=80&w=2000')" }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-b from-slate-50/80 to-slate-100/90"></div>
      
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Soft Animated Blobs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.5] animate-blob bg-blue-100`} />
        <div className={`absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.4] animate-blob animation-delay-2000 bg-teal-50`} />
        <div className={`absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[140px] opacity-[0.3] animate-blob animation-delay-4000 bg-cyan-100`} />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 h-[80px] max-w-[1600px] mx-auto bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {setAppState('UPLOAD'); setReportText('');}}>
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
               <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 uppercase flex items-center">
              Medi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Insight</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <a href="#" className="hidden md:block text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">How it works</a>
          <a href="#" className="hidden md:block text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors">Privacy</a>
          <div className="w-px h-6 bg-slate-300 hidden md:block"></div>
          
          {appState === 'DASHBOARD' ? (
             <button 
               onClick={() => {setAppState('UPLOAD'); setReportText(''); setAnalysis(null); setTheme(THEMES['General']);}}
               className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-700 transition-all rounded-full bg-white border border-slate-300 hover:bg-slate-50 hover:shadow-md"
             >
               Analyze Another <ArrowRight className="w-4 h-4" />
             </button>
          ) : (
             <button 
               onClick={() => document.getElementById('fileUpload')?.click()}
               className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white transition-all rounded-full bg-gradient-to-r from-blue-600 to-teal-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105"
             >
               Get Started <ArrowRight className="w-4 h-4" />
             </button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 w-full">
        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-4 text-red-800 animate-in fade-in slide-in-from-top-4 shadow-xl">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            </div>
            <p className="flex-1 text-base font-medium">{errorMsg}</p>
            <button onClick={() => setErrorMsg('')} className="p-1.5 hover:bg-red-200 rounded-full transition-colors"><X className="w-6 h-6 text-red-600" /></button>
          </div>
        )}

        {appState === 'UPLOAD' && (
          <UploadScreen 
            reportText={reportText} 
            setReportText={setReportText} 
            onAnalyze={() => analyzeReport(reportText)} 
            setErrorMsg={setErrorMsg}
          />
        )}

        {appState === 'ANALYZING' && (
          <LoadingScreen message={loadingMsg} theme={theme} />
        )}

        {appState === 'DASHBOARD' && analysis && (
          <Dashboard 
            analysis={analysis} 
            theme={theme} 
            chatHistory={chatHistory} 
            setChatHistory={setChatHistory}
          />
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function UploadScreen({ reportText, setReportText, onAnalyze, setErrorMsg }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const loadTesseract = async () => {
    if (window.Tesseract) return window.Tesseract;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = () => resolve(window.Tesseract);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setErrorMsg('');
    
    if (file.type.startsWith('text/') || file.type === 'application/json' || file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => setReportText(e.target.result);
      reader.readAsText(file);
    } 
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        setIsExtracting(true);
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        
        let extractedText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        
        setReportText(extractedText);
      } catch (err) {
        console.error(err);
        setErrorMsg('Failed to extract text from PDF. The file might be corrupted or protected.');
      } finally {
        setIsExtracting(false);
      }
    }
    else if (file.type.startsWith('image/')) {
      try {
        setIsExtracting(true);
        const Tesseract = await loadTesseract();
        const result = await Tesseract.recognize(file, 'eng', {
          logger: m => console.log(m)
        });
        setReportText(result.data.text);
      // eslint-disable-next-line no-unused-vars
      } catch (err) {
        setErrorMsg('Failed to extract text from image. Please try pasting the text instead.');
      } finally {
        setIsExtracting(false);
      }
    } 
    else {
      setErrorMsg('Unsupported file format. Please upload an image, PDF, or text file.');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center py-4 px-4 md:px-8 max-w-[1400px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 w-full items-center">
          
          {/* Left Side: Descriptive Text & Visual Elements */}
          <div className="flex flex-col relative z-10 order-2 lg:order-1 animate-slide-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 border border-blue-200 w-fit mb-4 md:mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Your Personal Health Assistant</span>
            </div>

            <h2 className="text-4xl md:text-5xl xl:text-6xl font-extrabold text-slate-800 leading-[1.15] tracking-tight mb-4 md:mb-6">
              Understand your health <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 pb-1 inline-block">
                without the confusion.
              </span>
            </h2>
            
            <p className="text-slate-600 text-lg xl:text-xl leading-relaxed max-w-lg mb-6 md:mb-8 font-medium">
              Upload your complex medical reports, lab results, or X-rays. Our friendly AI will read them and explain everything super simply—just like talking to a doctor who is also a friend!
            </p>

            {/* Hospital/Medical Image Graphic */}
            <div className="relative w-full max-w-lg h-40 xl:h-48 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white/50 group">
               <img src="https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=1200" alt="Friendly Doctor Interface" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
               <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-teal-900/10 mix-blend-multiply"></div>
               
               {/* Floating Badges */}
               <div className="absolute bottom-3 left-3 glass-panel p-3 rounded-2xl flex items-center gap-3 animate-float-subtle">
                  <div className="bg-emerald-100 p-2 rounded-full"><Smile className="text-emerald-600 w-5 h-5"/></div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Report Status</p>
                    <p className="text-sm font-extrabold text-slate-800">Looking great!</p>
                  </div>
               </div>
               
               <div className="absolute top-4 right-4 glass-panel p-2.5 rounded-xl flex items-center gap-2 animate-float-delayed">
                  <HeartPulse className="text-rose-500 w-4 h-4 animate-pulse"/>
                  <span className="text-xs font-bold text-slate-800">Heart Rate Normal</span>
               </div>
            </div>
          </div>

          {/* Right Side: Interactive Upload Zone */}
          <div className="flex flex-col gap-4 md:gap-5 w-full max-w-md xl:max-w-lg mx-auto order-1 lg:order-2 animate-slide-right">
            
            {/* Drag & Drop Area */}
            <div 
              className={`relative flex flex-col items-center justify-center p-8 xl:p-10 border-2 border-dashed rounded-[2rem] transition-all duration-500 glass-panel overflow-hidden
                ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 bg-white/70 hover:bg-slate-50/90 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-500/15'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files[0]);
              }}
            >
              <input 
                type="file" 
                id="fileUpload" 
                className="hidden" 
                accept="image/*,.txt,.csv,.pdf,application/pdf" 
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              
              {isExtracting ? (
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-t-blue-500 rounded-full animate-spin absolute inset-0"></div>
                    <Camera className="w-8 h-8 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">Reading Document...</h3>
                    <p className="text-sm font-medium text-slate-500">Extracting text from your file...</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="p-5 mb-4 rounded-full bg-blue-50 border border-blue-100 shadow-inner group hover:scale-110 transition-transform duration-500">
                    <UploadCloud className="w-10 h-10 text-blue-500" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-slate-800 tracking-tight">Upload Report</h3>
                  <p className="mb-6 text-slate-500 font-medium text-sm">Drop an image, PDF, or text file here</p>
                  <button 
                    onClick={() => document.getElementById('fileUpload').click()}
                    className="px-6 py-3 text-base font-bold text-blue-700 transition-all bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-full flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    Browse Files <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">OR PASTE DIRECTLY</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Text Input Zone */}
            <div className="flex flex-col space-y-4">
              <div className="relative group flex-1">
                <textarea
                  className="w-full h-28 p-5 text-sm text-slate-700 transition-all bg-white/70 backdrop-blur-md border border-slate-300 rounded-[1.5rem] resize-none focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 custom-scrollbar shadow-sm leading-relaxed"
                  placeholder="Paste the raw text of your medical report here..."
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                />
              </div>
              
              <button 
                onClick={onAnalyze}
                disabled={!reportText.trim()}
                className="group flex items-center justify-center w-full gap-2 px-6 py-4 text-lg font-bold text-white transition-all rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <Zap className="w-6 h-6 fill-current" />
                Explain it Simply!
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ message, theme }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] space-y-12 animate-in fade-in zoom-in-95 duration-700">
      <div className="relative flex items-center justify-center w-56 h-56">
        <div className={`absolute inset-0 rounded-full opacity-50 blur-3xl animate-pulse ${theme.bgAccent}`} />
        <div className="absolute w-full h-full border-[4px] border-t-transparent border-b-transparent rounded-full animate-[spin_3s_linear_infinite] border-blue-300" />
        <div className="absolute w-3/4 h-3/4 border-[4px] border-l-transparent border-r-transparent rounded-full animate-[spin_2s_linear_infinite_reverse] border-teal-300" />
        <div className="absolute w-1/2 h-1/2 border-[4px] border-t-transparent border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite] border-blue-500" />
        <div className={`bg-white p-8 rounded-full shadow-2xl border border-slate-100`}>
          <HeartPulse className={`w-16 h-16 animate-pulse ${theme.accent}`} />
        </div>
      </div>
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold tracking-wider text-slate-800">Translating Report...</h2>
        <p className={`text-2xl transition-all duration-500 ${theme.accent} font-bold tracking-wide flex items-center justify-center gap-3`}>
           <Sparkles className="w-6 h-6" /> {message}
        </p>
      </div>
    </div>
  );
}

// Helper function to pick an icon based on parameter name
function getParameterIcon(name) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('blood') || lowerName.includes('hemo') || lowerName.includes('platelet') || lowerName.includes('rbc') || lowerName.includes('wbc')) return Droplet;
  if (lowerName.includes('heart') || lowerName.includes('cardio') || lowerName.includes('pulse')) return HeartPulse;
  if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('a1c')) return TestTube;
  if (lowerName.includes('cholesterol') || lowerName.includes('lipid') || lowerName.includes('ldl') || lowerName.includes('hdl')) return Activity;
  if (lowerName.includes('creatinine') || lowerName.includes('kidney') || lowerName.includes('urine')) return Microscope;
  if (lowerName.includes('temp')) return Thermometer;
  return ActivitySquare;
}

function Dashboard({ analysis, theme, chatHistory, setChatHistory }) {
  return (
    <div className="flex flex-col gap-8 md:gap-12 animate-in slide-in-from-bottom-10 duration-1000 pb-16 relative z-10 p-4 md:p-8 max-w-[1200px] mx-auto">
      
      {/* Top Banner: Patient Info & AI Health Summary */}
      <div className={`relative overflow-hidden p-8 md:p-10 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl group flex-shrink-0`}>
        <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[60px] opacity-40 group-hover:scale-110 transition-transform duration-1000 ${theme.bgAccent}`} />
        
        <div className="relative z-10 flex flex-col gap-8">
          
          {/* Header Row: Title & Basic Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className={`p-4 md:p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm flex-shrink-0`}>
                <theme.icon className={`w-10 h-10 md:w-12 md:h-12 ${theme.accent}`} />
              </div>
              <div>
                <span className={`px-4 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full border mb-2 inline-flex items-center gap-2 ${theme.bgAccent} ${theme.accent} border-white shadow-sm`}>
                  <div className={`w-2 h-2 rounded-full bg-current animate-pulse`} /> AI Analyzed Report
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{analysis.reportType}</h2>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
              <div className="flex items-center gap-2 text-slate-600 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                 <UserRound className="w-4 h-4 text-blue-500" />
                 <span className="font-bold text-sm">{analysis.patientInfo?.name || 'My Friend'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                 <Activity className="w-4 h-4 text-slate-400" />
                 <span className="font-medium text-sm">Age: {analysis.patientInfo?.age || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                 <Calendar className="w-4 h-4 text-slate-400" />
                 <span className="font-medium text-sm">Date: {analysis.patientInfo?.date || 'Recently'}</span>
              </div>
            </div>
          </div>

          {/* AI Health Summary & Key Findings Container */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-inner">
             
             {/* Left: Overall Summary */}
             <div className="flex flex-col gap-4">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-blue-500" /> AI Health Summary
                </h3>
                <p className="text-base md:text-lg text-slate-600 leading-relaxed font-medium">
                  {analysis.healthSummary || "I've read your report. Let's look at the details below!"}
                </p>
             </div>

             {/* Right: Key Findings */}
             <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-6 lg:pt-0 lg:pl-8">
                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Key Findings
                </h3>
                <div className="flex flex-col gap-3">
                  {analysis.keyFindings && analysis.keyFindings.map((finding, idx) => {
                    let dotColor = "bg-emerald-500";
                    if (finding.severity === "Severe Risk") dotColor = "bg-red-500";
                    else if (finding.severity === "Mild Risk") dotColor = "bg-amber-500";
                    else if (finding.severity === "Low / Moderate Concern") dotColor = "bg-orange-500";

                    return (
                      <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{finding.parameter}</p>
                          <p className="text-sm text-slate-500 font-medium">{finding.status}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Vertical Stack) */}
      <div className="flex flex-col gap-12 w-full items-center">
        
        {/* Health Metrics Section */}
        <div className="flex flex-col gap-6 w-full">
          
          {/* Section Header */}
          <div className="flex items-center gap-3 ml-2">
            <ClipboardList className="w-7 h-7 text-blue-600" />
            <h3 className="text-2xl font-extrabold text-slate-800">Your Health Metrics</h3>
            <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{analysis.parameterExplanations?.length || 0} Tested</span>
          </div>

          {/* MASONRY LAYOUT FOR METRIC CARDS */}
          <div className="columns-1 md:columns-2 gap-6 space-y-6 w-full">
            {analysis.parameterExplanations && analysis.parameterExplanations.map((item, index) => {
              // Determine Badge Configuration based on exact severity strings
              let badgeConfig = { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle, barColor: "bg-emerald-500", glow: "hover:shadow-emerald-500/10" };
              
              if (item.severity === "Severe Risk") {
                badgeConfig = { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, barColor: "bg-red-500", glow: "hover:shadow-red-500/10" };
              } else if (item.severity === "Mild Risk") {
                badgeConfig = { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, barColor: "bg-amber-500", glow: "hover:shadow-amber-500/10" };
              } else if (item.severity === "Low / Moderate Concern") {
                badgeConfig = { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: AlertCircle, barColor: "bg-orange-500", glow: "hover:shadow-orange-500/10" };
              }

              const ParamIcon = getParameterIcon(item.parameter);
              const BadgeIcon = badgeConfig.icon;

              return (
                <div 
                  key={index} 
                  // break-inside-avoid prevents the card from splitting across masonry columns
                  className={`break-inside-avoid inline-block w-full bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${badgeConfig.glow}`}
                  style={{ animationDelay: `${(index % 4) * 100}ms`, animationFillMode: 'both' }}
                >
                  {/* Top Row: Icon, Title */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-xl ${badgeConfig.bg} border ${badgeConfig.border}`}>
                      <ParamIcon className={`w-5 h-5 md:w-6 md:h-6 ${badgeConfig.color}`} />
                    </div>
                    <h4 className="font-extrabold text-xl md:text-2xl text-slate-800 leading-tight">{item.parameter}</h4>
                  </div>
                  
                  {/* Status Badge beneath Title */}
                  <div className={`w-fit px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border flex items-center gap-1.5 mb-8 ${badgeConfig.color} ${badgeConfig.bg} ${badgeConfig.border}`}>
                    <BadgeIcon className="w-3.5 h-3.5" /> {item.severity || 'Unknown'}
                  </div>

                  {/* Middle Row: Values & Progress Bar Stacked */}
                  <div className="flex flex-col gap-2 mb-6">
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Measured Value</p>
                      <p className="text-3xl md:text-4xl font-extrabold font-mono text-slate-800 mb-3">{item.value}</p>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Normal Range</p>
                      <p className="text-sm md:text-base font-bold text-slate-600 mb-4">{item.normalRange}</p>
                    </div>

                    {/* Visual Progress Bar */}
                    {item.isNumeric && item.positionPercentage !== undefined && item.positionPercentage !== null && (
                      <div className="w-full mt-2">
                         <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                           {/* The track is divided logically: 0-25 (Low), 25-75 (Normal/Green), 75-100 (High) */}
                           <div className="h-full w-1/4 bg-orange-200 border-r border-white/50"></div>
                           <div className="h-full w-2/4 bg-emerald-200 border-r border-white/50"></div>
                           <div className="h-full w-1/4 bg-red-200"></div>
                           
                           {/* The Indicator */}
                           <div 
                             className={`absolute top-0 bottom-0 w-2.5 rounded-full shadow-md z-10 ${badgeConfig.barColor} transition-all duration-1000 ease-out border-[2px] border-white`}
                             style={{ left: `calc(${Math.min(Math.max(item.positionPercentage, 0), 100)}% - 5px)` }}
                           />
                         </div>
                         <div className="flex justify-between mt-2 px-1">
                           <span className="text-[10px] font-bold text-slate-400">Low</span>
                           <span className="text-[10px] font-bold text-emerald-600">Normal</span>
                           <span className="text-[10px] font-bold text-slate-400">High</span>
                         </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100 mb-5" />

                  {/* Bottom Row: AI Friendly Explanation */}
                  <div className="flex items-start gap-3">
                    <Smile className="w-5 h-5 md:w-6 md:h-6 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed font-medium">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Plan Section */}
        <div className="flex flex-col gap-6 w-full mt-4">
          <div className="flex items-center gap-3 ml-2">
            <Stethoscope className="w-7 h-7 text-teal-600" />
            <h3 className="text-2xl font-extrabold text-slate-800">Your Action Plan</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Diet */}
            {analysis.dietPlan && analysis.dietPlan.length > 0 && (
              <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="flex items-center gap-3 text-emerald-700 font-extrabold mb-6 uppercase text-sm tracking-widest">
                  <Utensils className="w-6 h-6 text-emerald-500" /> Foods to Eat
                </h4>
                <ul className="space-y-4">
                  {analysis.dietPlan.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 font-medium text-base">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Routine Plan */}
            {analysis.routinePlan && analysis.routinePlan.length > 0 && (
              <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="flex items-center gap-3 text-blue-700 font-extrabold mb-6 uppercase text-sm tracking-widest">
                  <ActivitySquare className="w-6 h-6 text-blue-500" /> Routine
                </h4>
                <ul className="space-y-4">
                  {analysis.routinePlan.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 font-medium text-base">
                      <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Avoid */}
            {analysis.thingsToAvoid && analysis.thingsToAvoid.length > 0 && (
              <div className="p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="flex items-center gap-3 text-red-700 font-extrabold mb-6 uppercase text-sm tracking-widest">
                  <Ban className="w-6 h-6 text-red-500" /> What To Avoid
                </h4>
                <ul className="space-y-4">
                  {analysis.thingsToAvoid.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 font-medium text-base">
                      <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Premium AI Chatbot (Stacked at the bottom) */}
        <div className="w-full mt-10 h-[600px] z-20 flex flex-col shadow-2xl rounded-[2.5rem] bg-white">
          <ChatbotWidget 
            chatHistory={chatHistory} 
            setChatHistory={setChatHistory} 
            analysis={analysis}
            theme={theme}
          />
        </div>

      </div>
    </div>
  );
}

function ChatbotWidget({ chatHistory, setChatHistory, analysis }) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const SUGGESTED_PROMPTS = [
    "Explain my report in simple terms",
    "Which values should I worry about?",
    "How can I improve my health?",
    "What should I eat today?"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || isTyping) return;

    const userMsg = { role: 'user', content: messageText };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setInput('');
    setIsTyping(true);

    const systemPrompt = `You are a helpful, extremely friendly medical assistant. You are speaking to a non-medical person. 
    Here is the very simple analysis of their report: ${JSON.stringify(analysis)}. 
    Answer their questions based on this. Keep answers short, encouraging, and super easy to understand.
    Do NOT use medical jargon. Always gently remind them to consult their real doctor for serious concerns.`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedHistory
          ],
          temperature: 0.5
        })
      });

      const data = await response.json();
      const aiReply = data.choices[0].message.content;
      
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiReply }]);
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Oops, I'm having trouble connecting right now. Please check your connection and try asking again!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`flex flex-col flex-grow h-full rounded-[2.5rem] bg-white border border-slate-200 overflow-hidden relative group`}>
      
      {/* Premium Header */}
      <div className={`p-6 md:p-8 border-b border-slate-100 bg-blue-50/30 flex items-center gap-4 relative z-10`}>
        <div className={`p-3 md:p-4 rounded-2xl bg-blue-500 shadow-md flex-shrink-0`}>
          <Bot className={`w-6 h-6 md:w-8 md:h-8 text-white`} />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-slate-800 text-xl md:text-2xl flex items-center gap-3">
            Ask AI About Your Report
            <span className="relative flex h-3 w-3 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h3>
          <p className="text-sm text-slate-500 font-medium tracking-wide mt-1">Personalized health insights</p>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-grow p-6 md:p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar relative z-10 bg-white">
        
        {/* Render Suggested Prompts if only initial message is present */}
        {chatHistory.length === 1 && (
          <div className="flex flex-col gap-3 mt-2 mb-6 animate-in fade-in zoom-in-95 duration-700 delay-300">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1">Suggested Questions</p>
            {SUGGESTED_PROMPTS.map((promptText, i) => (
              <button 
                key={i}
                onClick={() => handleSend(promptText)}
                className="w-full text-left px-6 py-4 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl text-sm md:text-base font-semibold text-slate-600 hover:text-blue-700 transition-all shadow-sm"
              >
                {promptText}
              </button>
            ))}
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            {msg.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mr-4 mt-1">
                <Bot className="w-5 h-5 text-blue-500" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-[1.5rem] p-5 text-base leading-relaxed shadow-sm font-medium ${
              msg.role === 'user' 
                ? 'bg-blue-500 text-white rounded-br-sm' 
                : `bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-sm`
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start items-end">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mr-4">
              <Bot className="w-5 h-5 text-blue-500" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-[1.5rem] rounded-bl-sm p-5 flex gap-2 items-center shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} className="h-4" />
      </div>

      {/* Chat Input */}
      <div className="p-5 md:p-6 bg-white border-t border-slate-100 relative z-10 rounded-b-[2.5rem]">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full py-5 pl-6 pr-16 text-base text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-slate-400 font-medium"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={`absolute right-3 p-3.5 rounded-xl transition-all ${
              input.trim() ? `bg-blue-600 text-white hover:scale-105 shadow-md hover:bg-blue-700` : 'bg-slate-200 text-slate-400'
            }`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}