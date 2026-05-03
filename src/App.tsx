import React, { useState, useRef, useEffect } from 'react';
import { 
  FlaskConical, 
  Send, 
  FileText, 
  Code, 
  Download, 
  Copy, 
  Check, 
  Wand2, 
  RefreshCcw,
  Layout,
  ChevronRight,
  BookOpen,
  Menu,
  X,
  Eye,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { generateResearchMethod } from './services/geminiService';
import { exportToWord, copyToWordClipboard, generateFullLatex } from './lib/wordExport';

export default function App() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'manuscript' | 'latex_preview' | 'latex_src' | 'draft'>('manuscript');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isMobile, setIsMobile] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{[key: string]: boolean}>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const hiddenPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fullLatex = generateFullLatex(markdown);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateResearchMethod(prompt);
      setMarkdown(result);
      setActiveTab('manuscript');
      if (isMobile) setViewMode('preview');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLaTeX = () => {
    if (!fullLatex) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullLatex)
        .then(() => triggerCopyStatus('latex'))
        .catch(() => fallbackCopyText(fullLatex, 'latex'));
    } else {
      fallbackCopyText(fullLatex, 'latex');
    }
  };

  const fallbackCopyText = (text: string, type: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      if (document.execCommand('copy')) triggerCopyStatus(type);
    } catch (e) {
      console.error(e);
    }
    document.body.removeChild(textArea);
  };

  const handleCopyWord = async () => {
    const target = hiddenPreviewRef.current;
    if (target) {
      const range = document.createRange();
      range.selectNode(target);
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        if (document.execCommand('copy')) {
          triggerCopyStatus('word');
        } else {
          throw new Error();
        }
      } catch (err) {
        const html = target.innerHTML;
        const success = await copyToWordClipboard(html);
        if (success) triggerCopyStatus('word');
      } finally {
        selection.removeAllRanges();
      }
    }
  };

  const triggerCopyStatus = (id: string) => {
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0E1015] text-[#CED2D9] font-sans selection:bg-[#4F46E5]/30 selection:text-white">
      {/* Floating Global Export HUD */}
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100] flex items-center bg-[#16191F]/90 border border-white/5 rounded-2xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)] backdrop-blur-3xl p-1 gap-1"
      >
        <div className="hidden sm:flex px-5 border-r border-white/5 flex-col">
          <span className="text-[10px] font-black text-[#5e54ff] tracking-widest uppercase">SYD_NODE</span>
          <span className="text-[8px] text-[#8C939F] uppercase">MANUSCRIPT</span>
        </div>
        
        <button 
          onClick={handleCopyWord}
          className="p-3.5 sm:p-4 hover:bg-white/5 rounded-xl transition-all group flex flex-col items-center gap-1.5"
          title="Copy for Microsoft Word"
        >
          {copyStatus.word ? <Check className="size-5 text-emerald-400" /> : <FileText className="size-5 text-[#5e54ff]" />}
          <span className="text-[8px] font-bold text-[#8C939F] group-hover:text-white uppercase transition-colors">WORD</span>
        </button>

        <button 
          onClick={handleCopyLaTeX}
          className="p-3.5 sm:p-4 hover:bg-white/5 rounded-xl transition-all group flex flex-col items-center gap-1.5"
          title="Copy LaTeX Source"
        >
          {copyStatus.latex ? <Check className="size-5 text-emerald-400" /> : <Code className="size-5 text-[#5e54ff]" />}
          <span className="text-[8px] font-bold text-[#8C939F] group-hover:text-white uppercase transition-colors">LATEX</span>
        </button>

        <button 
          onClick={() => exportToWord(markdown)}
          className="p-3.5 sm:p-4 bg-[#4F46E5] hover:bg-indigo-700 rounded-xl transition-all group flex flex-col items-center gap-1.5 ml-1"
          title="Download .docx"
        >
          <Download className="size-5 text-white" />
          <span className="text-[8px] font-bold text-white uppercase">SAVE_DOC</span>
        </button>
      </motion.div>

      {/* Hidden high-fidelity renderer */}
      <div 
        ref={hiddenPreviewRef}
        style={{ position: 'absolute', left: '-10000px', width: '210mm', backgroundColor: 'white', color: 'black', padding: '40mm', zIndex: -1 }}
      >
        <style>{`
          .hidden-article { font-family: 'Times New Roman', serif; line-height: 1.6; color: #111; }
          .hidden-article table { width: 100%; border-collapse: collapse; border: 1pt solid black; margin: 15pt 0; page-break-inside: avoid; }
          .hidden-article th, .hidden-article td { border: 1pt solid black; padding: 10pt; text-align: left; font-size: 10.5pt; vertical-align: top; }
          .hidden-article th { background-color: #f3f4f6; font-weight: bold; }
          .hidden-article h1 { font-size: 24pt; font-weight: bold; margin-bottom: 20pt; text-align: center; }
          .hidden-article h2 { font-size: 16pt; font-weight: bold; margin-top: 24pt; border-bottom: 1pt solid #000; padding-bottom: 5pt; }
          .hidden-article p { margin-bottom: 12pt; text-align: justify; }
          .hidden-article .citation { vertical-align: super; font-size: 80%; font-weight: bold; color: #3b82f6; }
        `}</style>
        <div className="hidden-article">
          <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>

      {/* Axon Header */}
      <header className="px-6 py-4 sm:px-8 sm:py-6 border-b border-white/5 shrink-0 flex items-center justify-between bg-[#111318]">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-white">SCIDRAFT<span className="text-[#5e54ff]">.AI</span></h1>
            <span className="text-[9px] font-bold text-[#8C939F] tracking-[0.3em] uppercase">Protocol_Sync_v1.5</span>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex lg:hidden bg-[#16191F] border border-white/5 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('edit')}
            className={`p-2 transition-all rounded-md ${viewMode === 'edit' ? 'bg-[#4F46E5] text-white shadow-lg' : 'text-[#8C939F]'}`}
          >
            <Edit3 className="size-4" />
          </button>
          <button 
            onClick={() => setViewMode('preview')}
            className={`p-2 transition-all rounded-md ${viewMode === 'preview' ? 'bg-[#4F46E5] text-white shadow-lg' : 'text-[#8C939F]'}`}
          >
            <Eye className="size-4" />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-8">
           <div className="flex gap-4">
             {['split', 'edit', 'preview'].map((m) => (
                <button 
                  key={m}
                  onClick={() => setViewMode(m as any)}
                  className={`text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 transition-all ${viewMode === m ? 'text-[#5e54ff] border-b border-[#5e54ff]' : 'text-[#8C939F] hover:text-white'}`}
                >
                  {m === 'split' ? 'Workspace_Full' : m === 'edit' ? 'Editor_Focus' : 'Render_Visual'}
                </button>
             ))}
           </div>
           <div className="h-8 w-px bg-white/5"></div>
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-emerald-400">STATUS: READY</span>
              <span className="text-[8px] text-[#8C939F] uppercase">Latency 0.3ms</span>
           </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        <div className={`h-full grid transition-all duration-500 ease-in-out ${
          isMobile 
            ? 'grid-cols-1' 
            : viewMode === 'split' ? 'grid-cols-12' : viewMode === 'edit' ? 'grid-cols-1' : 'grid-cols-1'
        }`}>
          
          {/* Left Panel: Inputs */}
          <section className={`
            ${isMobile ? (viewMode === 'edit' ? 'flex' : 'hidden') : (viewMode === 'edit' ? 'flex max-w-4xl mx-auto w-full' : viewMode === 'split' ? 'lg:col-span-4 flex' : 'hidden')}
            flex-col p-6 sm:p-8 gap-8 border-r border-white/5 bg-[#111318] min-h-0
          `}>
             <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-[#5e54ff]">Generation_Matrix</h2>
                   <FlaskConical className="size-3 text-[#8C939F]" />
                </div>
                <div className="bg-[#16191F] border border-white/5 rounded-xl p-5 shadow-2xl flex flex-col gap-5">
                   <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe scientific goal (e.g. 'Standard protocol for EEG stress analysis')..."
                    className="w-full h-28 bg-transparent border-none focus:ring-0 text-sm font-mono leading-relaxed placeholder:text-[#8C939F]/30 resize-none"
                   />
                   <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full py-4 bg-[#4F46E5] hover:bg-indigo-700 rounded-xl text-white text-[11px] font-black tracking-[0.4em] uppercase transition-all flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95 shadow-[0_15px_30px_-10px_rgba(79,70,229,0.5)]"
                   >
                     {isGenerating ? <RefreshCcw className="size-4 animate-spin text-white" /> : <Wand2 className="size-4" />}
                     Initiate_Synthesis
                   </button>
                </div>
             </div>

             <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-[#8C939F]">Source_Buffer</h2>
                  <span className="text-[9px] font-mono opacity-20">UTF-8 / MKDN</span>
                </div>
                <div className="flex-1 bg-[#16191F]/50 border border-white/5 rounded-xl p-6 overflow-hidden">
                   <textarea 
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="w-full h-full bg-transparent border-none focus:ring-0 text-xs font-mono text-white/40 leading-relaxed resize-none scrollbar-thin scrollbar-thumb-white/5"
                    spellCheck={false}
                   />
                </div>
             </div>
          </section>

          {/* Right Panel: Renderings */}
          <section className={`
            ${isMobile ? (viewMode === 'preview' ? 'flex' : 'hidden') : (viewMode === 'preview' ? 'flex max-w-5xl mx-auto w-full' : viewMode === 'split' ? 'lg:col-span-8 flex' : 'hidden')}
            flex-col min-h-0 bg-[#0E1015]
          `}>
             {/* Tab Switcher */}
             <div className="px-8 pt-6 flex items-center justify-between border-b border-white/5 bg-[#111318]">
                <div className="flex gap-8 overflow-x-auto scrollbar-none pb-px">
                  {[
                    { id: 'manuscript', label: 'Draft_View', icon: FileText },
                    { id: 'latex_preview', label: 'Paper_Sim', icon: BookOpen },
                    { id: 'latex_src', label: 'TeX_Export', icon: Code }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2.5 text-[10px] font-black tracking-[0.2em] uppercase transition-all pb-4 border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'border-[#5e54ff] text-white' : 'border-transparent text-[#8C939F] hover:text-white'}`}
                    >
                      <tab.icon className="size-3" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="hidden sm:flex items-center bg-white/5 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-[8px] font-bold text-[#8C939F] uppercase">Renderer: GPU_Accelerated</span>
                </div>
             </div>

             {/* Output Area */}
             <div className="flex-1 overflow-hidden relative">
               <AnimatePresence mode="wait">
                 {activeTab === 'manuscript' ? (
                   <motion.div 
                    key="man"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full overflow-y-auto p-12 lg:p-24 bg-white"
                   >
                     <article className="max-w-[800px] mx-auto markdown-body scientific-article">
                        <style>{`
                          .scientific-article { font-family: 'Times New Roman', serif; color: #111; line-height: 1.7; font-size: 16px; }
                          .scientific-article table { width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #111; }
                          .scientific-article th, .scientific-article td { border: 1px solid #111; padding: 12px; text-align: left; }
                          .scientific-article th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 13px; font-family: sans-serif; letter-spacing: 0.05em; }
                          .scientific-article h1, .scientific-article h2, .scientific-article h3 { font-family: sans-serif; font-weight: 800; color: #000; letter-spacing: -0.02em; }
                          .scientific-article h1 { font-size: 32px; border-bottom: 4px solid #000; padding-bottom: 10px; margin-bottom: 30px; }
                          .scientific-article h2 { font-size: 20px; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                          .scientific-article .citation { color: #4F46E5; font-weight: bold; cursor: help; background: #EEF2FF; padding: 0 4px; border-radius: 3px; }
                          .scientific-article blockquote { border-left: 5px solid #F3F4F6; padding-left: 20px; font-style: italic; color: #666; }
                          .katex-display { margin: 25px 0; background: #fbfbfb; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
                        `}</style>
                        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                          {markdown}
                        </ReactMarkdown>
                     </article>
                   </motion.div>
                 ) : activeTab === 'latex_preview' ? (
                   <motion.div 
                    key="lat-pre"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="h-full overflow-y-auto bg-[#CED2D9] p-4 sm:p-12 lg:p-20"
                   >
                     {/* Responsive A4 Mockup Container */}
                     <div className="w-full max-w-[210mm] mx-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] bg-white min-h-[297mm] p-[10mm] sm:p-[20mm] relative flex flex-col mb-12 sm:mb-20 shrink-0">
                        {/* Document Header Decorations */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4F46E5]/10"></div>
                        
                        <div className="text-center mb-16 mt-4">
                           <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-4 text-black uppercase tracking-tight">Scientific Manuscript Analysis</h1>
                           <div className="flex items-center justify-center gap-4 text-[10px] font-sans uppercase tracking-[0.3em] font-black text-[#8C939F]">
                              <span>V1.50_SYNC</span>
                              <div className="size-1 rounded-full bg-[#8C939F]/30"></div>
                              <span>AI_NATIVE_SYNTHESIS</span>
                           </div>
                           <div className="mt-8 h-px bg-black/5 w-32 mx-auto"></div>
                        </div>

                        <div className="flex-1">
                           <article className="markdown-body font-serif prose prose-slate prose-lg max-w-none text-black">
                              <style>{`
                                .markdown-body table { width: 100% !important; border-collapse: collapse !important; border: 1pt solid black !important; margin: 25px 0 !important; }
                                .markdown-body th, .markdown-body td { border: 1pt solid black !important; padding: 12px !important; text-align: left !important; }
                                .markdown-body th { background-color: #f8fafc !important; font-weight: bold !important; text-transform: uppercase; font-size: 11px; font-family: sans-serif; border-bottom: 2pt solid black !important; }
                                .markdown-body p { text-align: justify; line-height: 1.8; margin-bottom: 1.5em; }
                                .markdown-body .katex-display { margin: 35px 0 !important; background: transparent !important; border: none !important; padding: 0 !important; }
                                .markdown-body h1 { border-bottom: 2.5pt solid black !important; padding-bottom: 10px !important; margin-bottom: 35px !important; text-align: center; }
                                .markdown-body h2 { font-size: 1.35em !important; border-bottom: 0.5pt solid #ccc !important; padding-bottom: 8px !important; margin-top: 40px !important; text-transform: uppercase; letter-spacing: 0.05em; }
                              `}</style>
                              <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
                                {markdown}
                              </ReactMarkdown>
                           </article>
                        </div>

                        <div className="mt-20 pt-8 border-t border-black/10 flex justify-between items-center opacity-50 text-[9px] font-mono tracking-widest uppercase">
                           <div className="flex flex-col gap-1">
                              <span>Authentication: 0xSciDraft-772-NODE</span>
                              <span>Sync_Time: {new Date().toISOString()}</span>
                           </div>
                           <div className="text-right">
                              <span>Classification: L3_HIGH_RESTRICTION</span>
                              <br/>
                              <span>Manuscript Page 01 (End of Draft)</span>
                           </div>
                        </div>
                     </div>
                   </motion.div>
                 ) : (
                   <motion.div 
                    key="lat-src"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full overflow-y-auto p-8 bg-[#0A0C10] font-mono text-[13px] leading-relaxed"
                   >
                     <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                        <span className="text-[10px] font-black tracking-widest text-[#4F46E5]">TEX_MANUSCRIPT_BUFFER</span>
                        <button onClick={handleCopyLaTeX} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-2">
                           {copyStatus.latex ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                           {copyStatus.latex ? 'COPIED' : 'CLONE_SRC'}
                        </button>
                     </div>
                     <pre className="text-white/60">
                        {fullLatex.split('\n').map((line, i) => (
                           <div key={i} className="flex gap-8 group hover:bg-white/5 transition-colors px-2">
                              <span className="w-8 shrink-0 text-white/5 text-right select-none">{i+1}</span>
                              <span className={`${line.startsWith('\\') ? 'text-[#5e54ff]/80 font-bold' : line.includes('{') || line.includes('}') ? 'text-emerald-500/80' : 'text-white/40'}`}>
                                {line || ' '}
                              </span>
                           </div>
                        ))}
                     </pre>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </section>
        </div>
      </main>

      {/* Adaptive Footer Notification Bar */}
      <footer className="px-8 py-4 border-t border-white/5 bg-[#0E1015] flex items-center justify-between shrink-0 overflow-hidden">
        <div className="flex gap-12 items-center">
           <div className="flex items-center gap-3">
              <div className={`size-2 rounded-full ${isGenerating ? 'bg-[#5e54ff] animate-ping' : 'bg-[#5e54ff]'}`}></div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em] whitespace-nowrap">Node_Standard_Sync</span>
           </div>
           <div className="hidden md:flex gap-8 text-[8px] font-mono text-white/10 tracking-[0.2em]">
              <span>[IEEE_754_COMPLIANT]</span>
              <span>[BIT_DEPTH_64]</span>
              <span>[LATEX_ENGINE_ACTIVE]</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-[8px] font-bold text-[#8C939F] uppercase">Scientific Adaptive UI // v1.50</span>
        </div>
      </footer>
    </div>
  );
}

const DEFAULT_MARKDOWN = `
# 基于多尺度时空特征提取的 EEG 压力监测协议 [1]

## 1. 实验核心配置方案

该方案定义了在实验室环境下进行压力诱导实验的标准参数映射与计算框架。

| 模块类别 | 核心变量 | 设定值与验证策略 | 备注 |
| :--- | :--- | :--- | :--- |
| **范式设置** | 诱导任务 (Task) | MIST (Mental Arithmetic) | 应力负荷标准化 [2] |
| | 基线期 (Baseline) | $300$ s (静息闭目) | 计算偏移量 |
| **数据采集** | 采样频率 ($f_s$) | $500$ Hz | 兼容湿电极/干电极 |
| | 通道数 ($Ch$) | $32$ (国际 10-20 系统) | 覆盖额叶与顶叶 |
| **预处理** | 滤波范围 | $1 \\sim 45$ Hz (FIR 滤波器) | 剔除工频干扰 |
| | 回归伪迹剔除 | 基于 ICA 的眼动修复 | 阈值设定 $\\pm 100 \\mu V$ |
| **训练矩阵** | 学习率 ($\\eta$) | $1.0 \\times 10^{-4}$ (AdamW) | 对数空间寻优 |
| | 批量大小 ($B$) | $32$ | 针对 A100/H100 优化 |
| | 损失函数 | $\\mathcal{L} = \\text{MSE} + \\lambda \\Omega(\\theta)$ | 添加权重衰减惩罚 |

## 2. 神经动力学数学模型

本协议的核心识别算法基于如下变分推理模型。根据学者 Smith 等人 [3] 的研究，门控机制对于捕获非线性脑电动力学至关重要：

$$
\\mathbf{z}_t = \\sigma(\\mathbf{W}_z \\cdot [\\mathbf{h}_{t-1}, \\mathbf{x}_t] + \\mathbf{b}_z)
$$
$$
\\mathbf{r}_t = \\sigma(\\mathbf{W}_r \\cdot [\\mathbf{h}_{t-1}, \\mathbf{x}_t] + \\mathbf{b}_r)
$$
$$
\\tilde{\\mathbf{h}}_t = \\tanh(\\mathbf{W}_h \\cdot [\\mathbf{r}_t \\odot \\mathbf{h}_{t-1}, \\mathbf{x}_t] + \\mathbf{b}_h)
$$

其中，$\\mathbf{z}_t$ 代表更新门 (Update Gate)，$\\mathbf{r}_t$ 为重置门 (Reset Gate)。$\\odot$ 为逐元素乘法。

## 3. 结果验证指标

通过跨受试者 (Cross-subject) 分组验证，我们采用以下平衡精度指标 $Acc_{bal}$ 进行泛化性能评估：

$$
Acc_{bal} = \\frac{1}{K} \\sum_{k=1}^K \\frac{TP_k}{TP_k + FN_k}
$$

## 4. 参考文献 (References)

1. Wang, X., et al. (2024). *Advances in Neural Architecture for Stress Detection.* Neural Physics Journal.
2. Zhang, L. & Li, M. (2023). *Standardized Protocols for EEG Signal Analysis.* Academic Press.
3. Smith, J. (2022). *Non-linear Dynamics in EEG-based Emotion Recognition.* IEEE Transactions on Affective Computing. [3]
`;
