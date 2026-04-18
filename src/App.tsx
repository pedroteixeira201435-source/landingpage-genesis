/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Calendar, 
  TrendingDown, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  ShieldCheck,
  Package,
  Wallet,
  Zap,
  Clock,
  ShieldAlert,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QUESTIONS, QuizState, RevenueBracket } from './types';
import { 
  calculateScore, 
  calculateMonthlyLoss, 
  getRecommendations, 
  calculateCategories,
  getMaturityLevel,
  getImpactFacts
} from './lib/scoring';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

type View = 'landing' | 'quiz' | 'results';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [showBusinessTypeStep, setShowBusinessTypeStep] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>({
    answers: {},
    revenue: 'N$ 500k – 2M',
    businessType: 'Mixed',
    name: '',
    email: '',
    phone: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const calendlyRef = useRef<HTMLDivElement>(null);

  const currentMonth = useMemo(() => 
    new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date()),
  []);

  const scrollToCalendly = () => {
    calendlyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const score = useMemo(() => {
    try {
      return calculateScore(quizState.answers, quizState.businessType) || 0;
    } catch (e) {
      console.error(e);
      return 0;
    }
  }, [quizState.answers, quizState.businessType]);

  const scoreColor = useMemo(() => {
    if (score < 50) return '#EF4444'; // Red-500
    if (score <= 80) return '#F59E0B'; // Amber-500
    return '#017E84'; // Accent (Teal)
  }, [score]);

  const monthlyLoss = useMemo(() => {
    try {
      return calculateMonthlyLoss(score, quizState.revenue) || 0;
    } catch (e) {
      console.error(e);
      return 0;
    }
  }, [score, quizState.revenue]);

  const recommendations = useMemo(() => {
    try {
      return getRecommendations(quizState.answers, quizState.businessType) || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [quizState.answers, quizState.businessType]);

  const maturityLevel = useMemo(() => {
    return getMaturityLevel(score);
  }, [score]);

  const impactFacts = useMemo(() => {
    return getImpactFacts(quizState.answers, quizState.businessType, quizState.revenue);
  }, [quizState.answers, quizState.businessType, quizState.revenue]);

  const categories = useMemo(() => {
    try {
      const cats = calculateCategories(quizState.answers);
      const marketAvg = 48; // Baseline for Namibian/SADC SMEs
      const userAvg = (cats.scores.finance + cats.scores.inventory + cats.scores.sales + cats.scores.compliance) / 4;
      const delta = Math.round(userAvg - marketAvg);
      
      return { ...cats, marketDeltaValue: delta };
    } catch (e) {
      console.error(e);
      return {
        financePiePct: 25,
        inventoryPiePct: 25,
        salesPiePct: 25,
        compliancePiePct: 25,
        scalabilityIndex: 0,
        benchmarkPercentile: 50,
        marketDeltaValue: 0,
        scores: { finance: 0, inventory: 0, sales: 0, compliance: 0 }
      };
    }
  }, [quizState.answers]);

  const handleAnswer = (questionId: number, optionIndex: number) => {
    setQuizState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: optionIndex }
    }));
    
    if (currentQuestion < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      // Auto-advance to results after the last question
      setTimeout(() => setView('results'), 600);
    }
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingLead, setIsSendingLead] = useState(false);
  const isQuizComplete = Object.keys(quizState.answers).length === QUESTIONS.length;

  const sendLeadToGoogleSheets = async (data: any) => {
    // URL fornecido pelo usuário
    const scriptUrl = 'https://script.google.com/macros/s/AKfycby4GMPSuqJgVXwAn80FebKsN39y5WTFnKaQWz8nmbUXR_3KaJaXJOefaZa-jxqMHWa0Qw/exec';

    setIsSendingLead(true);
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data),
      });
      console.log('Lead sent successfully to Google Sheets');
      
      // Salvar que este email já foi enviado para evitar duplicatas
      const submittedLeads = JSON.parse(localStorage.getItem('genesis_submitted_leads') || '[]');
      if (!submittedLeads.includes(data.email)) {
        submittedLeads.push(data.email);
        localStorage.setItem('genesis_submitted_leads', JSON.stringify(submittedLeads));
      }
    } catch (error) {
      console.error('Error sending lead to Google Sheets:', error);
    } finally {
      setIsSendingLead(false);
    }
  };

  const downloadPDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('report-content');
      if (!element) {
        console.error('Report content element not found');
        alert('Erro: Conteúdo do relatório não encontrado. Por favor, tente novamente.');
        setIsGeneratingPDF(false);
        return;
      }

      // Store scroll position
      const scrollPos = window.scrollY;
      window.scrollTo(0, 0);

      // Wait for any animations or rendering to settle
      await new Promise(resolve => setTimeout(resolve, 1000));

      const canvas = await html2canvas(element, { 
        scale: 1.2, // Lower scale for better stability on mobile/Vercel
        useCORS: true,
        allowTaint: true,
        logging: false, // Turn off logging for production-like feel
        backgroundColor: '#F9FAFB',
        width: element.offsetWidth,
        height: element.offsetHeight,
        onclone: (doc) => {
          // Force elements to be visible and stable for the screenshot
          const el = doc.getElementById('report-content');
          if (el) {
            el.style.padding = '20px';
            el.style.width = '1000px'; // Force a readable width for the capture
            
            // Remove blurry backgrounds or complex filters that break html2canvas
            const blurs = el.querySelectorAll('.backdrop-blur-lg, .blur-3xl');
            blurs.forEach((b: any) => {
              b.style.backdropFilter = 'none';
              b.style.filter = 'none';
              b.style.display = 'none'; // Hide decorative blurs for the PDF
            });
          }
        }
      });

      // Restore scroll
      window.scrollTo(0, scrollPos);

      if (!canvas) {
        throw new Error('Canvas generation failed');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4', true);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is taller than one page, add multiple pages
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Genesis_ERP_Audit_${quizState.name.replace(/\s+/g, '_') || 'Report'}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Houve um erro técnico ao gerar seu PDF. Por favor, tire um print da tela ou tente novamente em instantes.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans antialiased text-pretty">
      {/* Header */}
      <header className="bg-primary text-white py-4 md:py-6 px-6 md:px-16 flex justify-between items-center shadow-2xl relative z-10 border-b border-white/5">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-sm flex items-center justify-center shadow-lg group">
            <BarChart3 className="text-white w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-xl font-black tracking-tighter leading-none uppercase">Genesis ERP</span>
            <span className="text-[10px] font-bold uppercase tracking-[2px] opacity-60">Audit Systems</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 py-10 md:py-20 lg:py-28">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              exit={{ opacity: 0, y: -30 }}
              className="max-w-5xl mx-auto space-y-12 md:space-y-20"
            >
              <div className="space-y-6 md:space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center"
                >
                  <div className="inline-flex items-center px-4 py-1.5 bg-accent/10 text-accent border border-accent/20 rounded-full text-[10px] font-black uppercase tracking-[3px] mb-4">
                    <TrendingDown className="w-3 h-3 mr-2" /> Financial Friction Audit
                  </div>
                </motion.div>
                <h1 className="text-5xl md:text-7xl lg:text-[100px] font-black tracking-tighter text-primary leading-[0.9] md:leading-[0.8] lg:leading-[0.75] text-balance text-center mx-auto">
                   The Cost <br className="hidden md:block" /> of <span className="text-accent underline decoration-accent/30 underline-offset-8">Manual Work</span>
                </h1>
                <p className="text-lg md:text-2xl text-muted max-w-2xl mx-auto font-medium leading-relaxed md:leading-snug text-center">
                  Discover exactly how much money your SME is losing due to inefficient spreadsheets and manual friction. 
                </p>
              </div>

              <div className="flex flex-col items-center space-y-6 pt-4">
                {!showBusinessTypeStep ? (
                  <Button 
                    onClick={() => setShowBusinessTypeStep(true)}
                    className="btn-secondary w-full md:w-auto text-sm md:text-xl px-4 md:px-16 py-6 md:py-8 h-auto group shadow-xl hover:shadow-[rgba(1,126,132,0.2)] whitespace-normal text-center"
                  >
                    Start My Free Scorecard
                    <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="sleek-card w-full max-w-md space-y-6"
                  >
                    <h3 className="text-xl font-bold text-primary">What is your business model?</h3>
                    <div className="grid gap-3">
                      {(['Products', 'Services', 'Mixed'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setQuizState(prev => ({ ...prev, businessType: type }));
                            setView('quiz');
                          }}
                          className="quiz-option text-left active:scale-[0.98] transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{type === 'Products' ? 'Products & Manufacturing' : type === 'Services' ? 'Services & Consulting' : 'Mixed / Distribution'}</span>
                            <span className="text-xs text-muted opacity-80">{type === 'Products' ? 'Retail, factory, physical goods' : type === 'Services' ? 'Audit, tech, expert advice' : 'Wholesale or both products/services'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                <div className="flex items-center gap-6 text-sm font-bold text-[rgba(113,75,103,0.6)] uppercase tracking-widest">
                  <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-accent" /> 100% Free</span>
                  <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-accent" /> 2 Minutes</span>
                </div>
              </div>

                <div className="grid md:grid-cols-3 gap-8 py-8">
                  {[
                    { icon: Wallet, title: "Cash & Finance", desc: "Gain 100% visibility over your cashflow.", color: "bg-blue-50 text-blue-600" },
                    { icon: Package, title: "Inventory", desc: "Optimized stock turnover & zero stockouts.", color: "bg-teal-50 text-teal-600" },
                    { icon: ShieldCheck, title: "Compliance", desc: "Automated tax audit trails & reporting.", color: "bg-purple-50 text-purple-600" },
                  ].map((item, i) => (
                    <div key={i} className="sleek-card flex flex-col items-center text-center space-y-5 hover:shadow-2xl transition-all hover:-translate-y-1">
                      <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                        <item.icon className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-primary text-xl">{item.title}</h3>
                        <p className="text-sm text-muted font-medium">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
            </motion.div>
          )}

          {view === 'quiz' && QUESTIONS[currentQuestion] && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-[1fr_360px] gap-8 md:gap-12 items-start"
            >
              <div className="space-y-6 md:space-y-10">
                <div className="sleek-card p-6 md:p-14 min-h-[450px] md:min-h-[550px] flex flex-col justify-between overflow-hidden relative border-none bg-white shadow-2xl">
                  <div>
                    <div className="flex flex-col space-y-4 mb-8 md:mb-12">
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] md:text-xs font-black text-accent uppercase tracking-[3px]">
                          Audit Segment &bull; {QUESTIONS[currentQuestion].block.split(' ')[0]}
                        </div>
                        <div className="text-[10px] md:text-xs font-black text-primary/40 uppercase tracking-[2px]">
                          Step {currentQuestion + 1} / {QUESTIONS.length}
                        </div>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
                          className="h-full bg-accent transition-all duration-700 ease-out" 
                        />
                      </div>
                    </div>

                    <motion.h2 
                      key={currentQuestion}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl md:text-4xl lg:text-5xl font-black text-primary leading-[1.1] mb-8 md:mb-14 tracking-tighter"
                    >
                      {QUESTIONS[currentQuestion].text}
                    </motion.h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {QUESTIONS[currentQuestion].options.map((option, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => handleAnswer(QUESTIONS[currentQuestion].id, idx)}
                          className={`quiz-option py-5 md:py-6 px-6 border-2 transition-all cursor-pointer ${quizState.answers[QUESTIONS[currentQuestion].id] === idx ? 'quiz-option-selected border-accent bg-accent/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-base md:text-lg font-black text-primary uppercase tracking-tight">{option.label}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${quizState.answers[QUESTIONS[currentQuestion].id] === idx ? 'border-accent bg-accent' : 'border-slate-200'}`}>
                              {quizState.answers[QUESTIONS[currentQuestion].id] === idx && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 mt-10 gap-6 md:gap-0">
                    <div className="flex items-center text-muted text-[10px] font-black uppercase tracking-[2px]">
                      {currentQuestion > 0 ? (
                        <button 
                          onClick={() => setCurrentQuestion(prev => prev - 1)}
                          className="flex items-center hover:text-accent transition-colors"
                        >
                          <ChevronLeft className="mr-2 w-4 h-4" /> Previous Step
                        </button>
                      ) : (
                        <span className="opacity-50">Select an option to proceed</span>
                      )}
                    </div>
                    {currentQuestion === QUESTIONS.length - 1 && isQuizComplete ? (
                      <Button 
                        onClick={() => setView('results')}
                        className="btn-primary w-full md:w-auto py-6 px-10 text-xs font-black uppercase tracking-[3px] shadow-xl"
                      >
                        Generate Audit &rarr;
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          if (quizState.answers[QUESTIONS[currentQuestion].id] !== undefined) {
                            setCurrentQuestion(prev => Math.min(QUESTIONS.length - 1, prev + 1));
                          }
                        }}
                        disabled={quizState.answers[QUESTIONS[currentQuestion].id] === undefined}
                        className="btn-primary w-full md:w-auto py-6 px-10 text-xs font-black uppercase tracking-[3px] shadow-xl"
                      >
                        Continue &rarr;
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-6 flex flex-col">
                <div className="sleek-card p-8 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden order-2 md:order-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <h3 className="text-[10px] font-black text-accent uppercase tracking-[3px] mb-4">Market Context</h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-400 font-medium">
                    {currentQuestion < 3 ? "Manual bookkeeping adds 15%+ to payroll overhead in Namibia. Spreadsheets are not scalable assets." :
                     currentQuestion < 6 ? "Inventory blindness is the primary cause of cashflow freezes in manufacturing and retail sectors." :
                     currentQuestion < 8 ? "Disconnected sales data results in an average 8% loss in potential upsell revenue for consultants." :
                     "Tax compliance friction costs 40+ hours per month for the average SME without an ERP system."}
                  </p>
                </div>

                <div className="loss-gauge min-h-[300px] bg-accent p-8 flex flex-col justify-between order-1 md:order-2 border-none shadow-2xl relative overflow-hidden">
                   <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mb-24 blur-3xl" />
                   <div>
                    <div className="text-[10px] font-black text-white/60 uppercase tracking-[3px] mb-8">Estimated Monthly Friction</div>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={monthlyLoss}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4"
                      >
                        {Object.keys(quizState.answers).length >= 3 ? `N$ ${monthlyLoss.toLocaleString()}` : "ANALYSING..."}
                      </motion.div>
                    </AnimatePresence>
                    <p className="text-[10px] text-white/80 font-bold leading-relaxed uppercase tracking-wider max-w-[180px]">
                      {Object.keys(quizState.answers).length >= 3 ? "Base calculation for your current inefficiencies." : "Answer 3 questions to unlock potential loss."}
                    </p>
                  </div>
                  
                  <div className="mt-10">
                    <div className="flex justify-between text-[10px] font-black text-white/60 uppercase tracking-widest mb-3">
                      <span>Audit Quality</span>
                      <span>{Math.round((Object.keys(quizState.answers).length / QUESTIONS.length) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/20 rounded-full relative">
                      <div 
                        className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${(Object.keys(quizState.answers).length / QUESTIONS.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </aside>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto space-y-12 pb-20"
            >
              {!isSubmitted ? (
                <div className="max-w-xl mx-auto sleek-card p-10 md:p-16 space-y-10 border-none shadow-2xl bg-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-accent/10 text-accent rounded-sm flex items-center justify-center mx-auto mb-6">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter uppercase leading-none">Access Audit Data</h2>
                    <p className="text-sm text-muted font-bold uppercase tracking-widest leading-relaxed">Identity verification required to generate your unique Namibian SME process map.</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[2px] text-primary/40">Legal Full Name</Label>
                        <Input 
                          id="name" 
                          placeholder="Your Name" 
                          className="h-16 border-slate-100 bg-slate-50/50 focus:bg-white text-base font-bold transition-all px-6 rounded-sm focus:ring-accent"
                          value={quizState.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[a-zA-ZÀ-ÿ\s'-]*$/.test(val)) {
                              setQuizState(prev => ({ ...prev, name: val }));
                            }
                          }}
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[2px] text-primary/40">Work Email</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="name@company.com" 
                            className="h-16 border-slate-100 bg-slate-50/50 focus:bg-white text-base font-bold transition-all px-6 rounded-sm focus:ring-accent"
                            value={quizState.email}
                            onChange={(e) => setQuizState(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[2px] text-primary/40">Phone Number</Label>
                          <Input 
                            id="phone" 
                            type="tel" 
                            placeholder="+264 --- --- ---" 
                            className="h-16 border-slate-100 bg-slate-50/50 focus:bg-white text-base font-bold transition-all px-6 rounded-sm focus:ring-accent"
                            value={quizState.phone}
                            onChange={(e) => setQuizState(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <Label className="text-[10px] font-black uppercase tracking-[2px] text-primary/40">Annual Turnover Bracket (N$)</Label>
                      <RadioGroup 
                        value={quizState.revenue} 
                        onValueChange={(v) => setQuizState(prev => ({ ...prev, revenue: v as RevenueBracket }))}
                        className="grid grid-cols-2 gap-3"
                      >
                        {['< N$ 500,000', 'N$ 500k – 2M', 'N$ 2M – 5M', 'N$ 5M+'].map((rev) => (
                          <div key={rev} className={`flex items-center space-x-3 p-4 rounded-sm border-2 cursor-pointer transition-all ${quizState.revenue === rev ? 'border-accent bg-accent/5' : 'border-slate-50 bg-slate-50/30 hover:border-slate-100'}`}>
                            <RadioGroupItem value={rev} id={rev} className="text-accent border-slate-300" />
                            <Label htmlFor={rev} className="text-xs font-black text-primary uppercase tracking-tight cursor-pointer">{rev}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Button 
                      className="w-full btn-primary min-h-[64px] h-auto py-5 text-[10px] md:text-sm font-black uppercase tracking-[2px] md:tracking-[4px] mt-8 disabled:opacity-30 group shadow-2xl active:scale-[0.98] transition-all whitespace-normal text-center" 
                      disabled={!quizState.name || !quizState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quizState.email) || !quizState.phone || isSendingLead}
                      onClick={() => {
                        try {
                          const submittedLeadsRaw = localStorage.getItem('genesis_submitted_leads');
                          const submittedLeads = submittedLeadsRaw ? JSON.parse(submittedLeadsRaw) : [];
                          if (Array.isArray(submittedLeads) && submittedLeads.includes(quizState.email)) {
                            alert('This report has already been generated. Redirecting to your results...');
                          }
                        } catch (e) {
                          console.warn('LocalStorage not available', e);
                        }

                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setIsSubmitted(true);
                        
                        const scoreValue = calculateScore(quizState.answers);
                        sendLeadToGoogleSheets({
                          name: quizState.name,
                          email: quizState.email,
                          phone: quizState.phone,
                          revenue: quizState.revenue,
                          score: scoreValue,
                          answers: quizState.answers
                        }).catch(err => console.error('Failed to send lead:', err));
                      }}
                    >
                      {isSendingLead ? 'Encrypting & Analysing...' : 'Access My Custom Report \u2192'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-10 md:space-y-16" id="report-content">
                  <div className="text-center space-y-6 md:space-y-8">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center px-6 py-2 bg-accent/10 text-accent rounded-sm text-[10px] font-black uppercase tracking-[3px] border border-accent/20"
                    >
                      Audit Report #{Math.floor(Math.random() * 90000) + 10000}
                    </motion.div>
                    <h2 className="text-4xl md:text-7xl lg:text-8xl font-black text-primary tracking-tighter leading-[0.85] uppercase max-w-4xl mx-auto">Health <br /> Diagnostic</h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    <div className={`sleek-card flex flex-col items-center justify-center p-10 md:p-14 border-none shadow-2xl bg-white relative overflow-hidden`}>
                      <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: scoreColor }} />
                      <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 224 224">
                          <circle cx="112" cy="112" r="100" stroke="#f8fafc" strokeWidth="16" fill="transparent" />
                          <motion.circle
                            initial={{ strokeDashoffset: 628.3 }}
                            animate={{ strokeDashoffset: isNaN(score) ? 628.3 : 628.3 - (628.3 * score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="112" cy="112" r="100" stroke={scoreColor} strokeWidth="16" fill="transparent"
                            strokeDasharray={628.3}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-6xl md:text-8xl font-black tracking-tighter leading-none" style={{ color: scoreColor }}>{isNaN(score) ? 0 : score}</span>
                          <span className="text-[10px] md:text-xs font-black uppercase tracking-[3px] opacity-40 mt-1" style={{ color: scoreColor }}>Efficiency Score</span>
                        </div>
                      </div>
                      
                      <div className="mt-8 text-center space-y-2">
                        <div className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-[2px]">
                          Phase: {maturityLevel.title}
                        </div>
                        <p className="text-muted font-bold tracking-tight text-sm md:text-base px-4 leading-relaxed italic">
                           "{maturityLevel.description}"
                        </p>
                      </div>
                    </div>

                    <div className="sleek-card flex flex-col items-center justify-center p-10 md:p-14 border-none shadow-2xl bg-white relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-sm flex items-center justify-center mb-10">
                        <TrendingDown className="w-10 h-10" />
                      </div>
                      <div className="text-center space-y-4">
                        <h3 className="text-[10px] font-black text-primary/40 uppercase tracking-[3px]">Monthly Capital Erosion</h3>
                        <div className="text-5xl md:text-7xl font-black text-primary tracking-tighter leading-none">
                          N$ {isNaN(monthlyLoss) ? 0 : monthlyLoss.toLocaleString()}
                        </div>
                      </div>
                      <p className="mt-10 text-center text-muted font-bold uppercase tracking-tight text-sm md:text-base px-4 leading-relaxed">
                        Projected Annual Loss: <span className="text-red-500">N$ {isNaN(monthlyLoss) ? 0 : (monthlyLoss * 12).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    <div className="sleek-card bg-primary text-white p-10 md:p-12 border-none shadow-2xl space-y-8 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-110 transition-transform" />
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-[3px] text-white/40">Scalability Potential</div>
                        <div className="text-6xl font-black tracking-tighter">{categories.scalabilityIndex}%</div>
                      </div>
                      <div className="space-y-4">
                        <Progress value={categories.scalabilityIndex} className="h-1 bg-white/10 rounded-none" />
                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-relaxed">
                          {categories.scalabilityIndex < 40 ? "LOCKED: Manual tasks are blocking top-line growth." : 
                           categories.scalabilityIndex < 75 ? "CONSTRAINED: Legacy bottlenecks limiting expansion velocity." : 
                           "UNLOCKED: Infrastructure ready for 5x scale operations."}
                        </p>
                      </div>
                    </div>

                    <div className="sleek-card border-none shadow-2xl bg-slate-50 p-10 md:p-12 space-y-8 relative overflow-hidden">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-[3px] text-primary/40">Regional Position</div>
                        <div className="flex items-baseline gap-4">
                           <div className="text-6xl font-black tracking-tighter text-primary">Top {categories.benchmarkPercentile}%</div>
                           {categories.marketDeltaValue < 0 && (
                             <div className="text-xs font-black text-red-500 uppercase tracking-tight bg-red-50 px-2 py-1">
                               {Math.abs(categories.marketDeltaValue)}% Below Average
                             </div>
                           )}
                           {categories.marketDeltaValue > 0 && (
                             <div className="text-xs font-black text-accent uppercase tracking-tight bg-accent/5 px-2 py-1">
                               +{categories.marketDeltaValue}% Above Average
                             </div>
                           )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-primary/10 pb-2">
                           <span className="text-[10px] font-black text-primary/40 uppercase tracking-[2px]">Market Benchmark</span>
                           <span className="text-xs font-black text-accent">Namibian SME SADC Average</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest leading-relaxed">
                           Performing better than {100 - categories.benchmarkPercentile}% of verified regional competitors.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown Section */}
                  <div className="sleek-card p-10 md:p-16 border-none shadow-2xl bg-white space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div className="space-y-2">
                         <h3 className="text-2xl md:text-4xl font-black text-primary uppercase tracking-tighter">Friction Breakdown</h3>
                         <p className="text-xs font-bold text-muted uppercase tracking-[2px]">Identifying high-resistance operational segments.</p>
                      </div>
                      <div className="flex gap-6 text-[10px] font-black uppercase tracking-[2px]">
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical</div>
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Mid-Risk</div>
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> Optimal</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                      {[
                        { name: 'Finance & Cashflow', score: categories.scores.finance },
                        { name: 'Inventory & Ops', score: categories.scores.inventory },
                        { name: 'Sales & Customers', score: categories.scores.sales },
                        { name: 'Compliance & Tax', score: categories.scores.compliance },
                      ].map((cat, idx) => {
                        const s = Math.round(cat.score);
                        const colorClass = s < 50 ? 'bg-red-500' : s <= 80 ? 'bg-amber-500' : 'bg-accent';
                        const textColorClass = s < 50 ? 'text-red-500' : s <= 80 ? 'text-amber-500' : 'text-accent';
                        
                        return (
                          <div key={idx} className="space-y-4 group">
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[2px]">{cat.name}</span>
                              <span className={`text-2xl font-black tracking-tight ${textColorClass}`}>{s}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-50 rounded-none overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${s}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.2, delay: 0.3 + (idx * 0.1) }}
                                className={`h-full ${colorClass}`}
                              />
                            </div>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-wider leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                              {s < 50 ? "URGENT: Structural modernization required to halt capital drain." : 
                               s <= 80 ? "INEFFICIENT: Automation gaps are increasing operational resistance." :
                               "STABLE: Highly efficient digital infrastructure detected."}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Impact Facts Section - NEW */}
                  {impactFacts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {impactFacts.map((fact, i) => (
                        <div key={i} className="sleek-card border-none bg-accent/5 border-accent/10 flex flex-col space-y-4">
                          <div className="flex items-center gap-2">
                             <div className="w-10 h-10 rounded-sm bg-accent/10 flex items-center justify-center text-accent">
                               {fact.icon === 'Clock' && <Clock className="w-5 h-5" />}
                               {fact.icon === 'Package' && <Package className="w-5 h-5" />}
                               {fact.icon === 'ShieldAlert' && <ShieldAlert className="w-5 h-5" />}
                               {fact.icon === 'EyeOff' && <EyeOff className="w-5 h-5" />}
                             </div>
                             <h4 className="text-[10px] font-black uppercase tracking-[2px] text-accent">{fact.area}</h4>
                          </div>
                          <p className="text-sm font-bold text-primary leading-snug">
                            {fact.fact}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recommendation Logic with better design */}
                  <div className="bg-primary text-white p-10 md:p-16 shadow-2xl border-none space-y-12 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -mr-48 -mt-48 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                     <div className="space-y-2 text-center md:text-left">
                        <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Strategic Directives</h3>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-[3px]">Mapping the shortest path to 99% operational efficiency.</p>
                     </div>
                     <div className="grid gap-6">
                        {recommendations.slice(0, 3).map((rec, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-6 p-6 md:p-8 bg-white/5 border border-white/10 backdrop-blur-sm relative overflow-hidden"
                          >
                            <div className="text-4xl font-black text-accent/30 flex-shrink-0 tabular-nums">{i + 1}</div>
                            <p className="text-sm md:text-xl font-black uppercase tracking-tight leading-tight">{rec}</p>
                          </motion.div>
                        ))}
                     </div>
                  </div>

                  {/* HIGH-CONVERSION OFFER SECTION - RETHOUGHT */}
                  <div className="bg-primary p-1 md:p-1 shadow-2xl relative">
                    <div className="bg-white p-10 md:p-20 border-[12px] border-primary space-y-12 text-center">
                       <div className="space-y-4">
                          <div className="inline-block px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[3px] mb-4">Limited Availability Audit</div>
                          <h3 className="text-3xl md:text-6xl font-black text-primary tracking-tighter uppercase leading-none">Recover your N$ {monthlyLoss.toLocaleString()}</h3>
                          <p className="text-lg md:text-2xl text-muted font-bold max-w-3xl mx-auto leading-relaxed">
                            We only accept <span className="text-primary underline">4 new Genesis ERP clients per month</span> to ensure perfect, hand-mapped implementation for the Namibian market.
                          </p>
                       </div>

                       <div className="grid md:grid-cols-3 gap-8">
                          {[
                            { label: "Current Open Slots", value: "2/4", desc: `For this month, ${currentMonth}.` },
                            { label: "Audit Value", value: "N$ 6,500", desc: "Waived for scorecard users today." },
                            { label: "Audit Level", value: "Level 1", desc: "Primary process mapping session." },
                          ].map((stat, i) => (
                            <div key={i} className="space-y-1">
                               <div className="text-[10px] font-black uppercase tracking-[2px] text-primary/40 leading-none mb-2">{stat.label}</div>
                               <div className="text-3xl font-black text-primary tracking-tighter">{stat.value}</div>
                               <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{stat.desc}</div>
                            </div>
                          ))}
                       </div>

                       <div className="space-y-10 pt-6">
                         <div className="space-y-4 max-w-2xl mx-auto">
                            <p className="text-sm font-black text-primary uppercase tracking-[2px]">Scorecard Bonus: Valid for 48 Hours Only</p>
                            <div className="grid gap-3">
                               {[
                                 "Full Custom ERP Requirements Audit",
                                 "Personalized Process Friction Map",
                                 "Direct Implementation Roadmap with Pedro"
                               ].map((bonus, i) => (
                                 <div key={i} className="flex items-center justify-center gap-3 text-xs md:text-sm font-black text-primary uppercase tracking-tight">
                                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" /> {bonus}
                                 </div>
                               ))}
                            </div>
                         </div>
                         
                         <Button 
                           onClick={scrollToCalendly}
                           className="w-full md:w-auto bg-primary text-white hover:bg-primary/95 min-h-[64px] h-auto py-5 px-6 md:px-20 text-[10px] md:text-xs font-black uppercase tracking-[2px] md:tracking-[4px] shadow-2xl group relative overflow-hidden active:scale-[0.98] transition-all whitespace-normal text-center flex items-center justify-center"
                         >
                           <span className="relative z-10">Confirm My Strategy Call & Audit</span>
                         </Button>
                         
                         <p className="text-[10px] font-black text-muted uppercase tracking-[3px] opacity-40 italic">
                            No obligation. No hard sales. Just high-level engineering strategy for your business.
                         </p>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                    <Button 
                      onClick={downloadPDF} 
                      disabled={isGeneratingPDF}
                      className="bg-accent text-white hover:bg-accent/95 h-16 text-[10px] font-black uppercase tracking-[3px] px-12 rounded-none border-none shadow-xl disabled:opacity-50"
                    >
                      <Download className={`mr-2 w-4 h-4 ${isGeneratingPDF ? 'animate-bounce' : ''}`} /> 
                      {isGeneratingPDF ? 'Encrypting PDF...' : 'Download Full Audit PDF'}
                    </Button>
                  </div>

                  {/* Calendly Inline Widget */}
                  <div ref={calendlyRef} className="sleek-card border-none shadow-2xl bg-white overflow-hidden p-0 scroll-mt-20">
                    <div className="p-10 md:p-14 border-b border-slate-50 text-center md:text-left space-y-4">
                      <h3 className="text-3xl md:text-4xl font-black text-primary uppercase tracking-tighter">Confirmation Interface</h3>
                      <p className="text-[10px] font-black text-muted uppercase tracking-[3px]">Secure Pedro Teixeira's roadmap session below.</p>
                    </div>
                    <div className="h-[700px] w-full">
                      <iframe
                        src="https://calendly.com/pedroteixeira201435/genesis-meetings?embed_domain=ai-studio&embed_type=Inline"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                      ></iframe>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="py-10 px-6 md:px-16 border-t border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-primary font-bold">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#00D166">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              Secure & Confidential
            </div>
            <div className="text-xs font-bold text-muted uppercase tracking-widest">&copy; 2024 Genesis ERP Namibia. Licensed B2B Tool.</div>
          </div>
          <div className="flex space-x-8 text-xs font-bold text-muted uppercase tracking-widest">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {view === 'results' && isSubmitted && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-[rgba(255,255,255,0.8)] backdrop-blur-lg border-t border-slate-200 z-50 md:hidden flex gap-3"
          >
            <Button 
              onClick={scrollToCalendly}
              className="flex-1 bg-accent text-white h-14 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
            >
              Book Strategy Call
            </Button>
            <Button 
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              variant="outline"
              className="w-14 h-14 rounded-xl border-2 border-slate-200 flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
            >
              <Download className={`w-5 h-5 text-primary ${isGeneratingPDF ? 'animate-spin' : ''}`} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
