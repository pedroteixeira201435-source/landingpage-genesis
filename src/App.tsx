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
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QUESTIONS, QuizState, RevenueBracket } from './types';
import { calculateScore, calculateMonthlyLoss, getRecommendations, calculateCategories } from './lib/scoring';
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
      return getRecommendations(quizState.answers) || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [quizState.answers]);

  const categories = useMemo(() => {
    try {
      return calculateCategories(quizState.answers);
    } catch (e) {
      console.error(e);
      return {
        financePiePct: 25,
        inventoryPiePct: 25,
        salesPiePct: 25,
        compliancePiePct: 25,
        scalabilityIndex: 0,
        benchmarkPercentile: 50,
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
    <div className="min-h-screen flex flex-col bg-bg text-text font-sans selection:bg-[rgba(1,126,132,0.3)]">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-6 md:px-16 flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-inner">
            <BarChart3 className="text-primary w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-tight">Financial Health Audit</span>
            <span className="text-xs font-bold uppercase tracking-[2px] opacity-70">by Genesis ERP Namibia</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto text-center space-y-10"
            >
              <div className="space-y-6">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-primary leading-[1.1]">
                  Discover Exactly How Much Money Your Business Is <span className="text-accent">Losing Every Month</span>
                </h1>
                <p className="text-xl text-muted max-w-2xl mx-auto font-medium">
                  Take this 2-minute Financial Health Scorecard and get your personalized report with exact monthly losses.
                </p>
              </div>

              <div className="flex flex-col items-center space-y-6 pt-4">
                {!showBusinessTypeStep ? (
                  <Button 
                    onClick={() => setShowBusinessTypeStep(true)}
                    className="btn-secondary text-xl px-16 py-8 h-auto group shadow-xl hover:shadow-[rgba(1,126,132,0.2)]"
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
              className="grid md:grid-cols-[1fr_340px] gap-10 items-start"
            >
              <div className="space-y-8">
                <div className="sleek-card p-12 min-h-[500px] flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col space-y-3 mb-10">
                      <div className="text-xs font-bold text-accent uppercase tracking-[1.5px]">
                        {QUESTIONS[currentQuestion].block} &bull; Question {currentQuestion + 1} of {QUESTIONS.length}
                      </div>
                      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-500" 
                          style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight mb-10">
                      {QUESTIONS[currentQuestion].text}
                    </h2>

                    <div className="grid md:grid-cols-2 gap-5">
                      {QUESTIONS[currentQuestion].options.map((option, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleAnswer(QUESTIONS[currentQuestion].id, idx)}
                          className={`quiz-option ${quizState.answers[QUESTIONS[currentQuestion].id] === idx ? 'quiz-option-selected' : ''}`}
                        >
                          <span className="text-lg">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-10 border-t border-[#E2E8F0] mt-10">
                    <div className="flex items-center text-muted text-sm font-medium">
                      {currentQuestion > 0 ? (
                        <button 
                          onClick={() => setCurrentQuestion(prev => prev - 1)}
                          className="flex items-center hover:text-primary transition-colors"
                        >
                          <ChevronLeft className="mr-1 w-4 h-4" /> Back
                        </button>
                      ) : (
                        <span>Press <strong>ENTER</strong> to continue</span>
                      )}
                    </div>
                    {currentQuestion === QUESTIONS.length - 1 && isQuizComplete ? (
                      <Button 
                        onClick={() => setView('results')}
                        className="btn-primary"
                      >
                        See My Results &rarr;
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          if (quizState.answers[QUESTIONS[currentQuestion].id] !== undefined) {
                            setCurrentQuestion(prev => Math.min(QUESTIONS.length - 1, prev + 1));
                          }
                        }}
                        disabled={quizState.answers[QUESTIONS[currentQuestion].id] === undefined}
                        className="btn-primary"
                      >
                        Next Question &rarr;
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="sidebar-box">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-[1.5px] mb-3">Why this matters</h3>
                  <p className="text-sm leading-relaxed text-muted">
                    {currentQuestion < 3 ? "Manual data entry is the #1 killer of SME scaling in Namibia. Every hour spent on a spreadsheet is an hour not spent on high-level strategy or sales." :
                     currentQuestion < 6 ? "Inventory leakage and stockouts can drain up to 12% of your annual revenue. Real-time visibility is the difference between profit and loss." :
                     currentQuestion < 8 ? "Late payments and poor sales visibility create cashflow bottlenecks that prevent you from reinvesting in your growth." :
                     "The time your team spends manually preparing for compliance is a massive hidden payroll cost and a major liability risk."}
                  </p>
                </div>

                <div className="loss-gauge min-h-[280px] bg-accent">
                  <div className="text-[10px] font-bold text-[rgba(255,255,255,0.7)] uppercase tracking-[2px] mb-6">Potential Monthly Leakage</div>
                  <div className="text-4xl font-extrabold text-white mb-3">
                    {Object.keys(quizState.answers).length >= 3 ? `N$ ${monthlyLoss.toLocaleString()}` : "N$ --,---"}
                  </div>
                  <p className="text-xs text-[rgba(255,255,255,0.8)] leading-relaxed max-w-[200px]">
                    {Object.keys(quizState.answers).length >= 3 ? "This is a preliminary estimate based on your answers so far." : "Answer the next 3 questions to unlock your preliminary leakage estimate."}
                  </p>
                  <div className="mt-8 w-full h-1 bg-[rgba(255,255,255,0.2)] rounded-full relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-500" 
                      style={{ width: `${(Object.keys(quizState.answers).length / QUESTIONS.length) * 100}%` }}
                    />
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
              className="max-w-5xl mx-auto space-y-12"
            >
              {!isSubmitted ? (
                <div className="max-w-md mx-auto sleek-card space-y-8">
                  <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold text-primary">Your Report is Ready!</h2>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-[rgba(113,75,103,0.6)]">Full Name</Label>
                      <Input 
                        id="name" 
                        placeholder="Pedro Teixeira" 
                        className="h-14 border-2 focus:border-accent text-base"
                        value={quizState.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          // RegEx: Apenas letras, espaços e acentuação de qualquer língua. Bloqueia símbolos.
                          if (val === '' || /^[a-zA-ZÀ-ÿ\s'-]*$/.test(val)) {
                            setQuizState(prev => ({ ...prev, name: val }));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[rgba(113,75,103,0.6)]">Work Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="pedro@genesis-erp.com" 
                        className="h-14 border-2 focus:border-accent text-base"
                        value={quizState.email}
                        onChange={(e) => setQuizState(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[rgba(113,75,103,0.6)]">Phone Number</Label>
                      <Input 
                        id="phone" 
                        type="tel" 
                        placeholder="+264 81 123 4567" 
                        className="h-14 border-2 focus:border-accent text-base"
                        value={quizState.phone}
                        onChange={(e) => setQuizState(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-[rgba(113,75,103,0.6)]">Approximate Annual Revenue</Label>
                      <RadioGroup 
                        value={quizState.revenue} 
                        onValueChange={(v) => setQuizState(prev => ({ ...prev, revenue: v as RevenueBracket }))}
                        className="grid grid-cols-2 gap-3"
                      >
                        {['< N$ 500,000', 'N$ 500k – 2M', 'N$ 2M – 5M', 'N$ 5M+'].map((rev) => (
                          <div key={rev} className="flex items-center space-x-2 border-2 p-3 rounded-lg hover:border-accent cursor-pointer transition-all">
                            <RadioGroupItem value={rev} id={rev} className="text-primary border-primary" />
                            <Label htmlFor={rev} className="text-xs font-bold cursor-pointer">{rev}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <Button 
                      className="w-full btn-secondary h-14 text-lg mt-4 disabled:opacity-50" 
                      disabled={!quizState.name || !quizState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quizState.email) || !quizState.phone || isSendingLead}
                      onClick={() => {
                        try {
                          // Verificar se o email já foi usado nesta sessão/máquina
                          const submittedLeadsRaw = localStorage.getItem('genesis_submitted_leads');
                          const submittedLeads = submittedLeadsRaw ? JSON.parse(submittedLeadsRaw) : [];
                          
                          if (Array.isArray(submittedLeads) && submittedLeads.includes(quizState.email)) {
                            alert('Este email já foi usado para gerar um relatório hoje. Caso precise de uma nova análise, entre em contato conosco.');
                            return;
                          }
                        } catch (e) {
                          console.warn('LocalStorage not available', e);
                        }

                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setIsSubmitted(true);
                        
                        // Enviar dados para o Google Sheets (Background)
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
                      {isSendingLead ? 'Analysing Data...' : 'Show My Score \u2192'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-12" id="report-content">
                  <div className="text-center space-y-4">
                    <div className="inline-flex items-center px-5 py-2 bg-[rgba(1,126,132,0.1)] text-accent rounded-full text-xs font-bold uppercase tracking-[2px]">
                      Analysis Complete
                    </div>
                    <h2 className="text-5xl md:text-6xl font-extrabold text-primary tracking-tight">Your Business Health Score</h2>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 md:gap-10">
                    <div className={`sleek-card flex flex-col items-center justify-center space-y-6 bg-white py-10 border-b-8`} style={{ borderBottomColor: scoreColor }}>
                      <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 224 224">
                          <circle cx="112" cy="112" r="100" stroke="#f1f5f9" strokeWidth="16" fill="transparent" />
                          <circle
                            cx="112" cy="112" r="100" stroke={scoreColor} strokeWidth="16" fill="transparent"
                            strokeDasharray={628.3} strokeDashoffset={isNaN(score) ? 628.3 : 628.3 - (628.3 * score) / 100}
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl md:text-7xl font-black leading-none" style={{ color: scoreColor }}>{isNaN(score) ? 0 : score}</span>
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[2px] opacity-50" style={{ color: scoreColor }}>Score</span>
                        </div>
                      </div>
                      <p className="text-center text-muted font-medium max-w-xs leading-relaxed text-sm md:text-base px-4">
                        {score > 80 ? "Your business is in great shape, but there's still room for optimization." : 
                         score > 50 ? "Your business is stable but leaking significant profits through manual processes." :
                         "Your business is at critical risk. Manual systems are draining your resources."}
                      </p>
                    </div>

                    <div className="sleek-card flex flex-col items-center justify-center space-y-6 md:space-y-8 bg-white border-b-8 border-red-500 py-10">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
                      </div>
                      <div className="text-center space-y-2 md:space-y-3">
                        <h3 className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-[2px]">Estimated Monthly Loss</h3>
                        <div className="text-4xl md:text-6xl font-black text-primary leading-none">
                          N$ {isNaN(monthlyLoss) ? 0 : monthlyLoss.toLocaleString()}
                        </div>
                      </div>
                      <p className="text-center text-muted font-medium leading-relaxed text-sm md:text-base px-4">
                        You are losing approximately <span className="font-bold text-primary">N$ {isNaN(monthlyLoss) ? 0 : (monthlyLoss * 12).toLocaleString()} per year</span> due to manual friction and inefficiencies.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="sleek-card bg-primary text-white space-y-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-[rgba(255,255,255,0.6)] text-center">Scalability Index</div>
                      <div className="text-5xl font-black text-center text-white">{categories.scalabilityIndex}%</div>
                      <Progress value={categories.scalabilityIndex} className="h-2 bg-[rgba(255,255,255,0.2)]" />
                      <p className="text-xs text-center text-[rgba(255,255,255,0.6)] font-medium">
                        {categories.scalabilityIndex < 40 ? "Your growth is tied to hiring more people. Automated systems are required to scale." : 
                         categories.scalabilityIndex < 75 ? "You have some automation, but legacy bottlenecks are slowing your expansion." : 
                         "Your business is highly optimized for growth."}
                      </p>
                    </div>

                    <div className="sleek-card border-accent border-2 bg-white space-y-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-muted text-center">Namibian SME Benchmark</div>
                      <div className="text-5xl font-black text-center text-primary">Top {categories.benchmarkPercentile}%</div>
                      <div className="flex justify-between text-[10px] font-bold text-muted uppercase">
                        <span>Better than {100 - categories.benchmarkPercentile}% of peers</span>
                      </div>
                      <p className="text-xs text-center text-muted font-medium leading-relaxed">
                         Calculated based on digital transformation levels across Namibia SADC region.
                      </p>
                    </div>
                  </div>

                  {/* Pie Chart Section */}
                  <div className="sleek-card space-y-8 overflow-hidden">
                    <h3 className="text-xl md:text-2xl font-bold text-primary border-b-4 border-[rgba(113,75,103,0.1)] pb-3 inline-block">Where You Are Losing Money</h3>
                    <div className="grid md:grid-cols-[250px_1fr] gap-8 md:gap-12 items-center">
                      <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto">
                        <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90">
                          {/* Finance */}
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#714B67" strokeWidth="32" 
                            strokeDasharray={`${categories.financePiePct} 100`} />
                          {/* Inventory */}
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#017E84" strokeWidth="32" 
                            strokeDasharray={`${categories.inventoryPiePct} 100`} 
                            strokeDashoffset={-categories.financePiePct} />
                          {/* Sales */}
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#00A09D" strokeWidth="32" 
                            strokeDasharray={`${categories.salesPiePct} 100`} 
                            strokeDashoffset={-(categories.financePiePct + categories.inventoryPiePct)} />
                          {/* Compliance */}
                          <circle r="16" cx="16" cy="16" fill="transparent" stroke="#E54D42" strokeWidth="32" 
                            strokeDasharray={`${categories.compliancePiePct} 100`} 
                            strokeDashoffset={-(categories.financePiePct + categories.inventoryPiePct + categories.salesPiePct)} />
                        </svg>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {[
                          { label: 'Finance & Cash', color: 'bg-[#714B67]', pct: categories.financePiePct },
                          { label: 'Inventory & Ops', color: 'bg-[#017E84]', pct: categories.inventoryPiePct },
                          { label: 'Sales & Customers', color: 'bg-[#00A09D]', pct: categories.salesPiePct },
                          { label: 'Taxes & Compliance', color: 'bg-[#E54D42]', pct: categories.compliancePiePct },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center space-x-3 p-3 md:p-4 rounded-xl bg-bg border border-slate-100">
                            <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${item.color}`} />
                            <div>
                              <div className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-wider leading-none mb-1">{item.label}</div>
                              <div className="text-base md:text-lg font-black text-primary leading-none">{Math.round(item.pct)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* NEW HIGH-CONVERSION CTA SECTION */}
                  <div className="bg-orange-600 text-white p-8 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden border-4 border-[rgba(255,255,255,0.2)]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(255,255,255,0.1)] rounded-full -mr-32 -mt-32 blur-3xl" />
                    <h3 className="text-2xl md:text-4xl font-black mb-6 flex items-center gap-3">
                      <Zap className="w-8 h-8 text-yellow-300 fill-yellow-300" /> Special Opportunity for You
                    </h3>
                    <div className="space-y-6 text-base md:text-xl font-medium leading-relaxed">
                      <p>
                        Your score of <span className="text-white font-black underline decoration-[rgba(255,255,255,0.4)]">{score}/100</span> shows you’re currently losing <span className="text-white font-black underline decoration-[rgba(255,255,255,0.4)]">N${monthlyLoss.toLocaleString()}</span> every single month.
                      </p>
                      <p>
                        we only accept 4 new Genesis ERP clients per month so we can guarantee a perfect, hands-free implementation in under 25 days.
                      </p>
                      <p className="bg-[rgba(255,255,255,0.2)] inline-block px-4 py-1 rounded-lg font-black">
                        Right now I still have 2 spots left this month.
                      </p>
                      <div className="space-y-3 pt-4">
                        <p className="font-black text-white">If you book your 15-minute Strategy Call before midnight tomorrow, I’ll give you:</p>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            A Free Custom ERP Requirements Audit (valued at N$ 6,500)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            Our team will map your exact processes before the call
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                            Priority implementation slot in {currentMonth}
                          </li>
                        </ul>
                      </div>
                      <p className="text-sm font-bold opacity-80 pt-4 uppercase tracking-wider">
                        This offer disappears in 48 hours — after that the price goes back to normal and the free audit is removed.
                      </p>
                    </div>
                    <Button 
                      onClick={scrollToCalendly}
                      className="w-full md:w-auto mt-10 bg-white text-orange-600 hover:bg-[rgba(255,255,255,0.9)] h-auto py-5 md:h-16 text-base md:text-xl px-6 md:px-12 rounded-xl font-black shadow-xl transition-all hover:scale-[1.02] whitespace-normal leading-tight text-center"
                    >
                      Yes, I Want My Free Audit + Strategy Call
                    </Button>
                  </div>

                  <div className="sleek-card space-y-8 md:space-y-10">
                    <h3 className="text-xl md:text-2xl font-bold text-primary border-b-4 border-accent pb-3 inline-block">Personalized Recommendations</h3>
                    <div className="grid gap-4 md:gap-6">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start space-x-4 md:space-x-6 p-6 md:p-8 bg-bg rounded-xl border-l-8 border-accent">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-accent text-primary rounded-full flex items-center justify-center flex-shrink-0 font-black text-base md:text-lg">
                            {i + 1}
                          </div>
                          <p className="text-lg md:text-xl font-bold text-primary leading-tight">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary text-white p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] text-center space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[rgba(1,126,132,0.2)] rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[rgba(1,126,132,0.2)] rounded-full -ml-32 -mb-32 blur-3xl" />
                    
                    <h3 className="text-2xl md:text-4xl font-extrabold leading-tight">Ready to turn your score into 95+?</h3>
                    <p className="text-[rgba(255,255,255,0.8)] max-w-2xl mx-auto text-base md:text-lg font-medium">
                      In under 45 days, Genesis ERP can automate your entire business, eliminate these losses, and give you back 20+ hours per week.
                    </p>
                    <div className="text-xl md:text-3xl font-black text-white tracking-tight">Book a 15-minute strategy call with Pedro</div>
                    <div className="flex flex-col md:flex-row gap-5 justify-center pt-4">
                      <Button 
                        onClick={downloadPDF} 
                        disabled={isGeneratingPDF}
                        className="bg-accent text-white hover:bg-[rgba(1,126,132,0.9)] h-14 md:h-16 text-sm md:text-lg px-4 md:px-12 rounded-full font-bold shadow-lg disabled:opacity-70 w-full md:w-auto overflow-hidden text-ellipsis whitespace-nowrap"
                      >
                        <Download className={`mr-2 w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${isGeneratingPDF ? 'animate-bounce' : ''}`} /> 
                        {isGeneratingPDF ? 'Gerando PDF...' : 'Download PDF Report'}
                      </Button>
                      <Button onClick={scrollToCalendly} className="bg-white text-primary hover:bg-[rgba(255,255,255,0.9)] h-14 md:h-16 text-sm md:text-lg px-4 md:px-12 rounded-full font-bold shadow-lg w-full md:w-auto">
                        <Calendar className="mr-2 w-4 h-4 md:w-5 md:h-5 flex-shrink-0" /> Book Strategy Call
                      </Button>
                    </div>
                  </div>

                  {/* Calendly Inline Widget */}
                  <div ref={calendlyRef} className="sleek-card overflow-hidden p-0 bg-white">
                    <div className="p-8 border-b border-[#E2E8F0]">
                      <h3 className="text-2xl font-black text-primary">Schedule Your Results Walkthrough</h3>
                      <p className="text-muted font-medium">Choose a time below to discuss your score and exact ERP process map with Pedro.</p>
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
