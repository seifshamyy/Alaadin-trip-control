import React, { useState, useEffect, useReducer, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Search, Plus, Edit2, Copy, Trash2, X, Check, Save,
    LayoutDashboard, Map, Link as LinkIcon, AlertCircle, ChevronDown,
    ChevronRight, ArrowLeft, Eye, Activity, Menu, PlusCircle, Trash,
    Sparkles, Send, Bot, Database, ChevronUp
} from 'lucide-react';

// --- environment & supabase ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

import { TRANSLATIONS } from './translations';
const LanguageContext = createContext(null);
export const useLanguage = () => useContext(LanguageContext);

const callOpenRouter = async (systemPrompt, userPrompt) => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Clean markdown json blocks and trailing commas
        content = content.replace(/```json/gi, '').replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();

        return JSON.parse(content);
    } catch (e) {
        console.error("AI Error:", e);
        throw new Error("AI returned invalid JSON format or failed to generate.");
    }
};

// --- utils ---
const slugify = (text) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const deepMerge = (target, source) => {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;

    const output = { ...target };
    Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!(key in target)) Object.assign(output, { [key]: source[key] });
            else output[key] = deepMerge(target[key], source[key]);
        } else {
            Object.assign(output, { [key]: source[key] });
        }
    });
    return output;
};

// --- Toast System ---
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            <div className="fixed bottom-4 end-4 z-50 flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-3 rounded shadow-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-200
            ${t.type === 'error' ? 'bg-red-600 text-white' :
                            t.type === 'success' ? 'bg-green-600 text-white' :
                                'bg-gray-800 text-white'}`}>
                        {t.type === 'error' && <AlertCircle size={16} />}
                        {t.type === 'success' && <Check size={16} />}
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// --- Language Provider ---
const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState('en');
    const t = useCallback((key) => TRANSLATIONS[lang][key] || key, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// --- Custom Hooks ---
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

// --- Basic UI Components ---
const Button = ({ children, variant = 'primary', className = '', isLoading, icon: Icon, ...props }) => {
    const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-[#1a1f3a] hover:bg-[#2a3152] text-white shadow-sm",
        secondary: "bg-white border border-gray-200 hover:border-gray-300 text-gray-700 shadow-sm",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
        ghost: "hover:bg-gray-100 text-gray-600",
        accent: "bg-[#c9922a] hover:bg-[#de9f26] text-white shadow-sm"
    };
    return (
        <button className={`${base} ${variants[variant]} ${className}`} disabled={isLoading || props.disabled} {...props}>
            {isLoading ? <Activity className="animate-spin" size={16} /> : Icon && <Icon size={16} />}
            {children}
        </button>
    );
};

const Input = ({ label, error, className = '', ...props }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <input className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50 focus:border-[#c9922a] transition-all
      ${error ? 'border-red-500' : 'border-gray-200 bg-white'}`} {...props} />
        {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h3 className="font-semibold text-lg text-[#1a1f3a]">{title}</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};
// --- Human Readable Structured Data Display ---
const HumanReadableDisplay = ({ data }) => {
    if (data === null || data === undefined) return null;

    const renderNode = (node, depth = 0) => {
        if (node === null || node === undefined) return <span className="text-gray-400 italic text-sm">Not provided</span>;
        if (Array.isArray(node)) {
            if (node.length === 0) return <span className="text-gray-400 italic text-sm">Empty list</span>;
            return (
                <ul className="list-disc ps-5 mt-1 space-y-2 marker:text-[#c9922a]">
                    {node.map((item, idx) => (
                        <li key={idx} className="text-gray-700">
                            {typeof item === 'object' && item !== null ? (
                                <div className="bg-white border text-start border-gray-100 p-3 rounded-lg mt-1 w-full box-border">
                                    {renderNode(item, depth + 1)}
                                </div>
                            ) : (
                                renderNode(item, depth + 1)
                            )}
                        </li>
                    ))}
                </ul>
            );
        } else if (typeof node === 'object') {
            const keys = Object.keys(node);
            if (keys.length === 0) return <span className="text-gray-400 italic text-sm">Empty</span>;
            return (
                <div className={`mt-2 space-y-3 ${depth > 0 ? 'ms-2' : ''}`}>
                    {keys.map((k) => (
                        <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 px-2 py-1 hover:bg-black/5 rounded transition-colors w-full box-border">
                            <span className="font-bold text-[#1a1f3a] text-xs uppercase tracking-wider shrink-0 w-32 border-b border-dashed border-gray-300 sm:border-none pb-1 sm:pb-0">
                                {k.replace(/_/g, ' ')}
                            </span>
                            <div className="text-gray-800 text-sm leading-relaxed overflow-hidden break-words w-full">
                                {typeof node[k] === 'boolean' ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${node[k] ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {node[k] ? 'YES' : 'NO'}
                                    </span>
                                ) : (
                                    renderNode(node[k], depth + 1)
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } else {
            return <span className="text-gray-700 text-sm font-medium">{String(node)}</span>;
        }
    };

    return (
        <div className="p-6 bg-white m-4 rounded-xl border border-gray-100 shadow-sm overflow-auto h-max min-h-[calc(100%-2rem)]">
            {renderNode(data)}
        </div>
    );
};

// --- AI Assisted Data Editor ---
const AIAssistedEditor = ({ value, onChange, label }) => {
    const { t } = useLanguage();
    const [mode, setMode] = useState('preview'); // preview | raw
    const [rawText, setRawText] = useState('');
    const [error, setError] = useState('');

    // AI State
    const [prompt, setPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (mode === 'raw') {
            setRawText(JSON.stringify(value || {}, null, 2));
            setError('');
        }
    }, [mode, value]);

    const handleRawBlur = () => {
        try {
            const parsed = JSON.parse(rawText);
            onChange(parsed);
            setError('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(value, null, 2));
        toast('Data Copied', 'success');
    };

    const handleAIGenerate = async () => {
        if (!prompt.trim()) return;
        setIsProcessing(true);

        const systemPrompt = `You are a strict data transformation API for a travel tours CMS. 
The user is editing the "${label}" field. 
Current Data Payload: ${JSON.stringify(value || {})}

Instructions:
1. Mutate the current data payload according to the user's instructions.
2. If the user asks to add something, append it logically to the current structure.
3. If the user asks to remove or change something, modify the existing structure.
4. IMPORTANT: YOU MUST RETURN ONLY RAW VALID JSON. DO NOT INCLUDE ANY MARKDOWN formatting like \`\`\`json. Return just the curly braces or brackets containing the structural result.`;

        try {
            const newData = await callOpenRouter(systemPrompt, prompt);
            onChange(newData);
            setPrompt('');
            toast('Update successful', 'success');
            if (mode === 'raw') {
                setRawText(JSON.stringify(newData, null, 2));
            }
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm h-[600px]">

            {/* AI Command Center */}
            <div className="bg-gradient-to-r from-[#1a1f3a] to-[#2a3152] p-4 border-b border-[#1a1f3a]">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[#c9922a]" />
                    <h4 className="text-white font-medium text-sm">{t('aiCommandAssistant')}</h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 relative">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('basicAIPrompt')}
                        className="flex-1 rounded-md px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#c9922a] resize-none h-14"
                        disabled={isProcessing}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIGenerate(); }
                        }}
                    />
                    <Button
                        variant="accent"
                        className="sm:self-end h-14"
                        isLoading={isProcessing}
                        disabled={!prompt.trim() || isProcessing}
                        onClick={handleAIGenerate}
                    >
                        {t('update')}
                    </Button>
                </div>
                <p className="text-xs text-white/50 mt-2">{t('pressEnterAI')}</p>
            </div>

            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200 shrink-0">
                    <div className="flex gap-2">
                        <button onClick={() => setMode('preview')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'preview' ? 'bg-white shadow-sm text-[#1a1f3a]' : 'text-gray-500 hover:text-gray-700'}`}>
                            <div className="flex items-center gap-1"><Eye size={14} /> {t('display')}</div>
                        </button>
                        <button onClick={() => setMode('raw')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${mode === 'raw' ? 'bg-white shadow-sm text-[#1a1f3a]' : 'text-gray-500 hover:text-gray-700'}`}>
                            <div className="flex items-center gap-1"><Database size={14} /> {t('rawData')}</div>
                        </button>
                    </div>
                    <button onClick={handleCopy} className="text-gray-400 hover:text-[#1a1f3a]"><Copy size={16} /></button>
                </div>

                <div className="flex-1 bg-white overflow-auto relative">
                    {mode === 'preview' ? (
                        value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0) ? (
                            <div className="text-center py-12 px-4 text-gray-500 h-full flex flex-col justify-center items-center">
                                <Bot size={48} className="mb-4 text-gray-200" />
                                <p className="text-sm font-medium mb-1">{t('noData')}</p>
                                <p className="text-xs">{t('typeInstructions')}</p>
                            </div>
                        ) : (
                            <HumanReadableDisplay data={value} />
                        )
                    ) : (
                        <div className="flex flex-col h-full bg-slate-50">
                            <textarea
                                value={rawText}
                                onChange={e => {
                                    setRawText(e.target.value);
                                    try { JSON.parse(e.target.value); setError(''); } catch (err) { setError(err.message); }
                                }}
                                onBlur={handleRawBlur}
                                className={`font-mono text-xs w-full flex-1 p-4 focus:outline-none resize-none ${error ? 'bg-red-50 text-red-900 border-red-500' : 'text-slate-800 bg-slate-50'}`}
                                spellCheck="false"
                            />
                            {error && <div className="p-2 bg-red-100 text-red-600 text-xs font-mono border-t border-red-200 flex items-center gap-1 shrink-0"><AlertCircle size={14} /> {error}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Tour Editor Wizard ---
const JSONB_FIELDS = [
    { key: 'content_data', label: 'Content' },
    { key: 'logistics_data', label: 'Logistics' },
    { key: 'itinerary_data', label: 'Itinerary' },
    { key: 'provisions_data', label: 'Provisions' },
    { key: 'requirements_data', label: 'Requirements' },
    { key: 'pricing_data', label: 'Pricing' }
];

const TOUR_TYPES = ['Day Trip', 'Multi-Day', 'Pilgrimage', 'Adventure', 'Cultural', 'Cruise', 'Custom'];

const TourEditor = ({ tour, onSave, onCancel, existingDestinations }) => {
    const { t, lang } = useLanguage();
    const [formData, setFormData] = useState(tour || {
        title: '', slug: '', tour_type: '', primary_destination: '', promo_link: '',
        content_data: {}, logistics_data: {}, itinerary_data: [], provisions_data: {}, requirements_data: {}, pricing_data: {}
    });
    const [activeTab, setActiveTab] = useState('basic');
    const [isSaving, setIsSaving] = useState(false);
    const [slugChecking, setSlugChecking] = useState(false);
    const [slugError, setSlugError] = useState('');
    const toast = useToast();

    const debouncedSlug = useDebounce(formData.slug, 400);

    useEffect(() => {
        const checkSlug = async () => {
            if (!debouncedSlug) return;
            if (tour?.slug === debouncedSlug) { setSlugError(''); return; }

            setSlugChecking(true);
            const { data, error } = await supabase.from('travel_tours').select('id').eq('slug', debouncedSlug).limit(1);
            setSlugChecking(false);

            if (error) toast(error.message, 'error');
            else if (data?.length > 0) setSlugError('Slug is already in use');
            else setSlugError('');
        };
        checkSlug();
    }, [debouncedSlug, tour?.slug, toast]);

    const handleSlugGenerate = () => {
        if (formData.title) setFormData(prev => ({ ...prev, slug: slugify(prev.title) }));
    };

    const handleSave = async () => {
        if (!formData.title || !formData.slug) {
            toast('Title and slug are required', 'error');
            setActiveTab('basic');
            return;
        }
        if (slugError) {
            toast('Please fix slug errors', 'error');
            setActiveTab('basic');
            return;
        }

        setIsSaving(true);
        await onSave(formData);
        setIsSaving(false);
    };

    const handleAIGenerateBasicInfo = async (prompt) => {
        if (!prompt.trim()) return;
        setIsSaving(true);
        const sysPrompt = `You are a travel tour AI assistant. The user wants to draft a new tour based on this prompt: "${prompt}".
Generate a JSON object with EXACTLY these keys:
- "title" (string, max 100 chars)
- "slug" (string, lowercase, url-safe)
- "tour_type" (string: Day Trip, Multi-Day, Pilgrimage, Adventure, Cultural, Cruise, Custom)
- "primary_destination" (string, city or country)

If the prompt is in Arabic, "title" and "primary_destination" must be in Arabic. 
ONLY RETURN RAW VALID JSON. NO MARKDOWN.`;

        try {
            const data = await callOpenRouter(sysPrompt, prompt);
            setFormData(prev => ({ ...prev, ...data }));
            toast(t('aiAutoFillSuccess'), 'success');
        } catch (e) {
            toast(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMasterAIGenerate = async (prompt) => {
        if (!prompt.trim()) return;
        setIsSaving(true);
        const sysPrompt = `You are an expert travel tour generator API.
User Prompt: "${prompt}"

Your job is to generate a COMPLETE tour itinerary including pricing and logistics, formatted strictly as JSON matching this schema:
{
  "title": "", "slug": "", "tour_type": "", "primary_destination": "",
  "content_data": {"description": "", "highlights": [""]},
  "logistics_data": {"meeting_point": "", "duration": "", "transportation": ""},
  "itinerary_data": [{"day": 1, "title": "", "description": ""}],
  "provisions_data": {"included": [""], "excluded": [""]},
  "requirements_data": {"physical_level": "", "what_to_bring": [""]},
  "pricing_data": {"base_price": 0, "currency": "USD", "includes_tax": true}
}
CRITICAL INSTRUCTION: If the prompt requests Arabic, OR if it is written in Arabic, ALL GENERATED TEXT CONTENT inside the JSON (titles, descriptions, locations) MUST BE IN EXTRAORDINARY, NATIVE ARABIC. The keys of the JSON must stay exactly as defined above in English.
RETURN ONLY JSON. DO NOT INCLUDE MARKDOWN OR \`\`\` wrappers.`;

        try {
            const data = await callOpenRouter(sysPrompt, prompt);
            setFormData(prev => ({ ...prev, ...data }));
            toast(t('masterSuccess'), 'success');
        } catch (e) {
            toast(e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [formData, handleSave, onCancel]);

    const tabs = [
        { id: 'basic', label: 'Basic Info' },
        ...JSONB_FIELDS.map(f => ({ id: f.key, label: f.label })),
        { id: 'preview', label: 'Preview' }
    ];

    return (
        <div className="flex flex-col h-full bg-[#f8f5f0] fixed inset-0 z-40 lg:ps-64 animate-in slide-in-from-right duration-300">
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={onCancel} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"><ArrowLeft size={20} /></button>
                            <div>
                                <h1 className="text-2xl font-bold text-[#1a1f3a]">{tour ? t('editTour') : t('createNew')}</h1>
                                <p className="text-gray-500 text-sm">{tour ? t('editingExisting') : t('draftingNew')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
                            <Button variant="primary" onClick={handleSave} isLoading={isSaving} icon={Save}>{t('saveTour')}</Button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                        {/* Vertical Tabs Sidebar */}
                        <div className="w-full md:w-48 lg:w-56 bg-gray-50 border-e border-gray-100 flex-shrink-0 flex md:flex-col overflow-x-auto hide-scrollbar">
                            {tabs.map(tData => (
                                <button
                                    key={tData.id}
                                    onClick={() => setActiveTab(tData.id)}
                                    className={`flex-shrink-0 text-start px-4 py-3 text-sm font-medium transition-all relative
                    ${activeTab === tData.id ? 'text-[#c9922a] bg-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                                >
                                    {t(tData.id) || tData.label}
                                    {activeTab === tData.id && <div className="absolute start-0 top-0 bottom-0 w-1 bg-[#c9922a] hidden md:block" />}
                                    {activeTab === tData.id && <div className="absolute bottom-0 start-0 end-0 h-1 bg-[#c9922a] md:hidden" />}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">
                            {activeTab === 'basic' && (
                                <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-left-2 duration-300 p-6 lg:p-8">

                                    {/* Master AI Generation Box */}
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-pink-100 flex flex-col sm:flex-row gap-3 items-start shadow-sm">
                                        <div className="bg-pink-100 p-2 rounded-full text-pink-600 shrink-0 mt-1">
                                            <Sparkles size={20} />
                                        </div>
                                        <div className="flex-1 w-full relative flex flex-col gap-2">
                                            <textarea
                                                id="ai-master-prompt"
                                                placeholder={t('masterAIPromptPlaceholder')}
                                                className="w-full text-sm py-3 px-3 border-none bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-pink-300 focus:outline-none min-h-[120px] resize-y"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleMasterAIGenerate(e.target.value);
                                                    }
                                                }}
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleMasterAIGenerate(document.getElementById('ai-master-prompt').value)}
                                                    className="px-4 py-2 bg-pink-600 text-white text-sm font-semibold rounded-md hover:bg-pink-700 transition shadow-sm"
                                                    disabled={isSaving}
                                                >
                                                    {t('masterAIGenerateBtn')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Generation Box for Basic Info */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
                                        <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 shrink-0">
                                            <Bot size={20} />
                                        </div>
                                        <div className="flex-1 w-full relative">
                                            <input
                                                id="ai-tour-prompt"
                                                type="text"
                                                placeholder={t('basicAIPrompt')}
                                                className="w-full text-sm py-2 px-3 border-none bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none pe-24"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAIGenerateBasicInfo(e.target.value);
                                                }}
                                            />
                                            <button
                                                onClick={() => handleAIGenerateBasicInfo(document.getElementById('ai-tour-prompt').value)}
                                                className="absolute end-1 top-1 bottom-1 px-3 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition"
                                                disabled={isSaving}
                                            >
                                                {t('autoFill')}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gray-100 h-px w-full my-4" />

                                    <Input label="Tour Title *" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. 7 Days Dubai Adventure" required />

                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Slug *</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50
                            ${slugError ? 'border-red-500' : 'border-gray-200'}`}
                                                />
                                                <div className="absolute right-3 top-2.5">
                                                    {slugChecking ? <Activity className="animate-spin text-gray-400" size={16} /> :
                                                        formData.slug && !slugError ? <Check className="text-green-500" size={16} /> : null}
                                                </div>
                                            </div>
                                            <Button variant="secondary" onClick={handleSlugGenerate} type="button" className="px-3">Generate</Button>
                                        </div>
                                        {slugError && <span className="text-xs text-red-500">{slugError}</span>}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-medium text-gray-700">Tour Type</label>
                                            <select
                                                value={formData.tour_type}
                                                onChange={e => setFormData({ ...formData, tour_type: e.target.value })}
                                                className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50 bg-white"
                                            >
                                                <option value="">Select a type...</option>
                                                {TOUR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-sm font-medium text-gray-700">Primary Destination</label>
                                            <input
                                                list="destinations" value={formData.primary_destination} onChange={e => setFormData({ ...formData, primary_destination: e.target.value })}
                                                placeholder="e.g. Dubai" className="px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50"
                                            />
                                            <datalist id="destinations">
                                                {existingDestinations.map(d => <option key={d} value={d} />)}
                                            </datalist>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-gray-700">Promo Link</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url" value={formData.promo_link || ''} onChange={e => setFormData({ ...formData, promo_link: e.target.value })}
                                                placeholder="https://..." className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50"
                                            />
                                            {formData.promo_link && (
                                                <a href={formData.promo_link} target="_blank" rel="noreferrer" className="flex items-center justify-center w-10 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-gray-600">
                                                    <LinkIcon size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {JSONB_FIELDS.find(f => f.key === activeTab) && (
                                <div key={activeTab} className="flex flex-col animate-in fade-in slide-in-from-right-2 duration-300 h-full p-4 lg:p-6 bg-gray-50/50">
                                    <AIAssistedEditor
                                        label={JSONB_FIELDS.find(f => f.key === activeTab).label}
                                        value={formData[activeTab] || (activeTab === 'itinerary_data' ? [] : {})}
                                        onChange={val => setFormData({ ...formData, [activeTab]: val })}
                                    />
                                </div>
                            )}

                            {activeTab === 'preview' && (
                                <div className="animate-in fade-in duration-300 max-w-3xl mx-auto p-6 lg:p-8">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg mt-4">
                                        <div className="h-48 bg-gradient-to-r from-[#1a1f3a] to-[#2a3152] relative p-8 flex flex-col justify-end">
                                            <div className="absolute top-4 right-4 bg-[#c9922a] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                                                {formData.tour_type || 'Custom Tour'}
                                            </div>
                                            <h2 className="text-3xl font-bold text-white mb-2 shadow-sm">{formData.title || 'Untitled Tour'}</h2>
                                            <div className="flex items-center text-gray-200 gap-4 text-sm">
                                                <span className="flex items-center gap-1"><Map size={16} /> {formData.primary_destination || 'Global'}</span>
                                                {formData.pricing_data?.base_price && <span className="font-semibold text-[#c9922a] bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">From ${formData.pricing_data.base_price}</span>}
                                            </div>
                                        </div>
                                        <div className="p-8">
                                            {formData.content_data?.description && <p className="text-gray-700 leading-relaxed mb-6">{formData.content_data.description}</p>}

                                            {Array.isArray(formData.itinerary_data) && formData.itinerary_data.length > 0 && (
                                                <div className="mb-8">
                                                    <h3 className="text-xl font-bold text-[#1a1f3a] mb-4 border-b pb-2">Itinerary Preview</h3>
                                                    <div className="space-y-4">
                                                        {formData.itinerary_data.slice(0, 3).map((day, i) => (
                                                            <div key={i} className="flex gap-4">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-8 h-8 rounded-full bg-[#1a1f3a]/10 text-[#1a1f3a] flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                                                                    {i < 2 && <div className="w-px h-full bg-gray-200 mt-2"></div>}
                                                                </div>
                                                                <div className="pb-4">
                                                                    <h4 className="font-semibold">{day.title || `Day ${i + 1}`}</h4>
                                                                    <p className="text-sm text-gray-600 mt-1">{day.description || 'No description'}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {formData.itinerary_data.length > 3 && <p className="text-sm text-gray-400 italic">... and {formData.itinerary_data.length - 3} more days.</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {formData.provisions_data && Object.keys(formData.provisions_data).length > 0 && (
                                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                                    <div>
                                                        <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2"><Check size={16} /> Included</h4>
                                                        <ul className="text-sm space-y-1 text-gray-600">
                                                            {Array.isArray(formData.provisions_data.included) ? formData.provisions_data.included.map((item, i) => <li key={i}>• {item}</li>) : <li>See details</li>}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2"><X size={16} /> Excluded</h4>
                                                        <ul className="text-sm space-y-1 text-gray-600">
                                                            {Array.isArray(formData.provisions_data.excluded) ? formData.provisions_data.excluded.map((item, i) => <li key={i}>• {item}</li>) : <li>See details</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main App Logic & UI ---
export default function App() {
    const { lang, t, setLang } = useLanguage();
    const [tours, setTours] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 300);

    // UI State
    const [editingTour, setEditingTour] = useState(null); // null = list, {} = new, {...} = edit
    const [deleteId, setDeleteId] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Pagination & Sorting
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [sortCol, setSortCol] = useState('id');
    const [sortAsc, setSortAsc] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const toast = useToast() || (() => { });

    const fetchTours = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('travel_tours').select('*', { count: 'exact' });

        if (debouncedSearch) {
            query = query.or(`title.ilike.%${debouncedSearch}%,slug.ilike.%${debouncedSearch}%,tour_type.ilike.%${debouncedSearch}%,primary_destination.ilike.%${debouncedSearch}%`);
        }

        query = query.order(sortCol, { ascending: sortAsc });

        // Pagination
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;
        query = query.range(from, to);

        const { data, count, error: err } = await query;
        if (err) {
            setError(err.message);
            toast(err.message, 'error');
        } else {
            setTours(data || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    }, [debouncedSearch, page, perPage, sortCol, sortAsc, toast]);

    useEffect(() => {
        fetchTours();
    }, [fetchTours]);

    const existingDestinations = useMemo(() => {
        return Array.from(new Set(tours.map(t => t.primary_destination).filter(Boolean)));
    }, [tours]);

    const uniqueTypes = useMemo(() => new Set(tours.map(t => t.tour_type).filter(Boolean)).size, [tours]);

    const handleCreateOrUpdate = async (tourData) => {
        const isNew = !tourData.id;
        let res;
        if (isNew) {
            // Create new
            const { id, ...insertData } = tourData;
            res = await supabase.from('travel_tours').insert([insertData]).select().single();
        } else {
            // Update existing
            res = await supabase.from('travel_tours').update(tourData).eq('id', tourData.id).select().single();
        }

        if (res.error) {
            if (res.error.code === '42501') {
                toast('Permission denied: Check Supabase RLS policies.', 'error');
            } else {
                toast(`Error: ${res.error.message}`, 'error');
            }
            return;
        }

        toast(`Tour successfully ${isNew ? 'created' : 'updated'}!`, 'success');
        setEditingTour(null);
        fetchTours();
    };

    const handleDelete = async () => {
        if (!deleteId || deleteConfirmText !== 'DELETE') return;

        // Optimistic UI
        const targetId = deleteId;
        setTours(prev => prev.filter(t => t.id !== targetId));
        setTotalCount(prev => prev - 1);
        setDeleteId(null);
        setDeleteConfirmText('');

        const { error } = await supabase.from('travel_tours').delete().eq('id', targetId);
        if (error) {
            toast(error.message, 'error');
            fetchTours(); // Revert on failure
        } else {
            toast('Tour deleted successfully', 'success');
        }
    };

    const handleDuplicate = async (tour) => {
        const { id, ...dataCopy } = tour;
        dataCopy.title = `${dataCopy.title} (Copy)`;
        dataCopy.slug = `${dataCopy.slug}-copy-${Math.floor(Math.random() * 1000)}`;

        const { data, error } = await supabase.from('travel_tours').insert([dataCopy]).select().single();
        if (error) {
            toast(error.message, 'error');
        } else {
            toast('Tour duplicated successfully', 'success');
            setEditingTour(data); // Open edit form for the duplicate
            fetchTours();
        }
    };

    const handleSort = (col) => {
        if (sortCol === col) setSortAsc(!sortAsc);
        else { setSortCol(col); setSortAsc(true); }
    };

    // --- Render ---
    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen bg-[#f8f5f0] flex relative text-[#0d1117] font-sans ${lang === 'ar' ? 'font-arabic' : ''}`}>
            {/* Sidebar */}
            <aside className="w-64 bg-[#1a1f3a] text-white hidden lg:flex flex-col shadow-2xl z-50 fixed h-full inset-y-0 start-0">
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <img src="https://whmbrguzumyatnslzfsq.supabase.co/storage/v1/object/public/Client%20Logos/alaadintrips.png" alt="Alaa Din Trips" className="h-10 object-contain bg-white rounded-md p-1" />
                    <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-bold uppercase transition">
                        {lang === 'en' ? 'AR' : 'EN'}
                    </button>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <button onClick={() => setEditingTour(null)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${!editingTour ? 'bg-[#c9922a] text-white shadow-lg' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                        <LayoutDashboard size={20} />
                        {t('allTours')}
                    </button>
                    <button onClick={() => setEditingTour({})} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors border border-white/10 border-dashed hover:border-[#c9922a] hover:bg-white/5 text-gray-300`}>
                        <PlusCircle size={20} />
                        {t('draftNew')}
                    </button>
                </nav>
                <div className="p-4 border-t border-white/10 text-xs text-center text-gray-400">
                    {t('appVersion')}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ps-64 flex flex-col h-screen overflow-hidden">

                {/* Editor Overlay */}
                {editingTour !== null ? (
                    <TourEditor
                        tour={Object.keys(editingTour).length > 0 ? editingTour : null}
                        onSave={handleCreateOrUpdate}
                        onCancel={() => setEditingTour(null)}
                        existingDestinations={existingDestinations}
                    />
                ) : (
                    /* List View */
                    <div className="flex-1 overflow-auto flex flex-col p-4 sm:p-6 lg:p-8 hide-scrollbar">
                        {/* Header */}
                        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-[#1a1f3a]">{t('dashboardTitle')}</h1>
                                <p className="text-gray-500 mt-1">{t('dashboardDesc')}</p>
                            </div>
                            <Button onClick={() => setEditingTour({})} icon={Plus}>{t('newTour')}</Button>
                        </header>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            {[
                                { label: t('totalActive'), val: totalCount, icon: Map, color: 'text-[#1a1f3a]' },
                                { label: t('uniqueDest'), val: existingDestinations.length, icon: Map, color: 'text-[#c9922a]' },
                                { label: t('tourTypesOffered'), val: uniqueTypes, icon: LayoutDashboard, color: 'text-indigo-600' }
                            ].map((stat, i) => (
                                <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
                                    <div className={`p-4 rounded-full bg-gray-50 ${stat.color}`}><stat.icon size={24} /></div>
                                    <div>
                                        <div className="text-3xl font-bold">{stat.val}</div>
                                        <div className="text-sm font-medium text-gray-500">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Toolbar */}
                        <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute start-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    type="text" placeholder={t('searchPlaceholder')}
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full ps-10 pe-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9922a]/50 text-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 w-full sm:w-auto">
                                <span>{t('show')}</span>
                                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1 bg-white focus:outline-none">
                                    {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span>{t('entries')}</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white border text-[#0d1117] border-gray-200 rounded-b-xl shadow-sm flex-1 overflow-auto relative">
                            {loading ? (
                                <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                                    <Activity className="animate-spin text-[#c9922a]" size={32} />
                                </div>
                            ) : tours.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                    <Map size={48} className="mb-4 text-gray-300" />
                                    <h3 className="text-lg font-medium text-gray-900">{t('noTours')}</h3>
                                    <p className="text-sm">{t('noToursDesc')}</p>
                                </div>
                            ) : null}

                            <table className="w-full text-start text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                                    <tr>
                                        {[t('id'), t('title'), t('type'), t('destination'), t('basePrice'), t('actions')].map((label, idx) => {
                                            const colKeys = ['id', 'title', 'tour_type', 'primary_destination', ''];
                                            const key = colKeys[idx];
                                            return (
                                                <th key={label} className={`px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors ${!key && 'cursor-default pointer-events-none text-end'}`} onClick={() => key && handleSort(key)}>
                                                    <div className={`flex items-center gap-1 ${!key && 'justify-end'}`}>
                                                        {label}
                                                        {key === sortCol && (sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                                                    </div>
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tours.map(tour => (
                                        <tr key={tour.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-400">#{tour.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-[#1a1f3a]">{tour.title}</div>
                                                <div className="text-xs text-gray-500">/{tour.slug}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    {tour.tour_type || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{tour.primary_destination || '-'}</td>
                                            <td className="px-6 py-4 font-medium text-green-700">
                                                {tour.pricing_data?.price || tour.pricing_data?.base_price ? `$${tour.pricing_data?.price || tour.pricing_data?.base_price}` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-end">
                                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setEditingTour(tour)} className="p-2 text-[#1a1f3a] hover:bg-gray-100 rounded-lg transition-colors" title={t('edit')}><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDuplicate(tour)} className="p-2 text-[#c9922a] hover:bg-amber-50 rounded-lg transition-colors" title={t('duplicate')}><Copy size={16} /></button>
                                                    <button onClick={() => setDeleteId(tour.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title={t('delete')}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination controls */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between text-sm shadow-md">
                                <span className="text-gray-500">{t('showing')} {Math.min((page - 1) * perPage + 1, totalCount)} {t('to')} {Math.min(page * perPage, totalCount)} {t('of')} {totalCount} {t('entries')}</span>
                                <div className="flex items-center gap-2">
                                    <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1">{t('prev')}</Button>
                                    <span className="font-medium text-[#1a1f3a]">{t('page')} {page}</span>
                                    <Button variant="secondary" disabled={page * perPage >= totalCount} onClick={() => setPage(p => p + 1)} className="px-3 py-1">{t('next')}</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Delete Modal */}
            <Modal isOpen={!!deleteId} onClose={() => { setDeleteId(null); setDeleteConfirmText(''); }} title={t('deleteConfirmTitle')}>
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-600">{t('deleteConfirmDesc')}</p>
                    <input
                        type="text"
                        placeholder="DELETE"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:border-red-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-3 mt-2">
                        <Button variant="ghost" onClick={() => setDeleteId(null)}>{t('cancel')}</Button>
                        <Button variant="danger" disabled={deleteConfirmText !== 'DELETE'} onClick={handleDelete}>{t('permDelete')}</Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}

// Wrap in provider
export function AppWithProviders() {
    return (
        <LanguageProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </LanguageProvider>
    );
}
