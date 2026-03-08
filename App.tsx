import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { 
  FileText, Layout, Download, CheckCircle, AlertTriangle, 
  Settings, Save, Upload, Wand2, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, ExternalLink, Printer, GraduationCap,
  Linkedin, Github
} from 'lucide-react';
import { ResumeData, TemplateConfig, ExperienceItem, EducationItem, SkillGroup, ProjectItem } from './types';
import { INITIAL_RESUME, TEMPLATES } from './constants';
import { improveText } from './services/geminiService';

import ReactMarkdown from 'react-markdown';

// --- Sub-components for Cleaner App.tsx ---

// Helper for Markdown Rendering
const MarkdownRenderer = ({ children, className = "" }: { children: string, className?: string }) => (
  <div className={`markdown-content ${className}`}>
    <ReactMarkdown 
      components={{
        ul: ({node, ...props}) => <ul className="list-disc ml-4 space-y-1" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal ml-4 space-y-1" {...props} />,
        li: ({node, ...props}) => <li className="pl-1" {...props} />,
        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
        em: ({node, ...props}) => <em className="italic" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);

// 1. Editor Components

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

const InputGroup = ({ label, value, onChange, placeholder, type = "text" }: InputGroupProps) => (
  <div className="mb-3">
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-400"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

interface TextAreaGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  onAi?: (type: 'fix' | 'professional' | 'shorten') => void;
  isAiLoading?: boolean;
}

const TextAreaGroup = ({ label, value, onChange, rows = 4, onAi, isAiLoading }: TextAreaGroupProps) => (
  <div className="mb-3 relative group">
    <div className="flex justify-between items-center mb-1">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      {onAi && (
        <button 
          onClick={() => onAi('professional')}
          className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          disabled={isAiLoading}
          type="button"
        >
          <Wand2 size={12} /> {isAiLoading ? 'Thinking...' : 'AI Improve'}
        </button>
      )}
    </div>
    <textarea
      className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 placeholder-gray-400"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const SectionHeader = ({ title, icon: Icon, isOpen, toggle }: any) => (
  <button 
    onClick={toggle}
    className="flex items-center justify-between w-full p-4 bg-white border-b hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-gray-500" />
      <span className="font-semibold text-gray-700">{title}</span>
    </div>
    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
  </button>
);

// 2. Preview Components (The Resume Renderer)
const ResumeRenderer = ({ data, template }: { data: ResumeData; template: TemplateConfig }) => {
  const { colors, fontBody, fontHeadings, layout } = template;

  // Helper styles based on template config
  // Use custom color if set, otherwise use template default (which we might need to parse if it's a class)
  // For simplicity, we'll apply customColor as an inline style for primary elements if it exists
  const primaryColorStyle = data.customColor ? { color: data.customColor } : {};
  const borderColorStyle = data.customColor ? { borderColor: data.customColor } : {};
  const bgColorStyle = data.customColor ? { backgroundColor: data.customColor } : {};

  const h1 = `${fontHeadings} text-3xl mb-1 ${colors.primary}`;
  const h2 = `${fontHeadings} text-lg font-bold uppercase tracking-wider mb-3 mt-6 border-b-2 ${colors.secondary} border-opacity-20 pb-1`;
  const h3 = `${fontBody} font-bold text-md ${colors.text}`;
  const p = `${fontBody} text-sm leading-relaxed ${colors.text}`;
  const sub = `${fontBody} text-xs ${colors.secondary}`;
  const link = `hover:underline ${colors.primary}`;
  const list = `list-disc ml-4 space-y-1 ${p}`;

  const Header = () => (
    <div className="mb-6">
      <h1 className={h1} style={primaryColorStyle}>{data.header.fullName}</h1>
      <p className={`${fontBody} text-lg ${colors.secondary} mb-2`}>{data.header.headline}</p>
      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm ${colors.secondary}`}>
        {data.header.email && <a href={`mailto:${data.header.email}`} className={link}>{data.header.email}</a>}
        {data.header.phone && <a href={`tel:${data.header.phone}`} className={link}>{data.header.phone}</a>}
        {data.header.location && <span>{data.header.location}</span>}
        {data.header.linkedin && <a href={data.header.linkedin.startsWith('http') ? data.header.linkedin : `https://${data.header.linkedin}`} target="_blank" rel="noreferrer" className={link}>LinkedIn</a>}
        {data.header.github && <a href={data.header.github.startsWith('http') ? data.header.github : `https://${data.header.github}`} target="_blank" rel="noreferrer" className={link}>GitHub</a>}
        {data.header.website && <a href={data.header.website.startsWith('http') ? data.header.website : `https://${data.header.website}`} target="_blank" rel="noreferrer" className={link}>Portfolio</a>}
      </div>
    </div>
  );

  const Summary = () => (
    data.summary ? (
      <section>
        <h2 className={h2} style={{...primaryColorStyle, ...borderColorStyle}}>Profile</h2>
        <div className={p}>
          <MarkdownRenderer>{data.summary}</MarkdownRenderer>
        </div>
      </section>
    ) : null
  );

  const Experience = () => (
    data.experience.length > 0 ? (
      <section>
        <h2 className={h2} style={{...primaryColorStyle, ...borderColorStyle}}>Experience</h2>
        <div className="space-y-6">
          {data.experience.map(exp => (
            <div key={exp.id}>
              <div className="flex justify-between items-baseline mb-2">
                <span className={`${sub} font-semibold text-lg`}>{exp.company}</span>
                <span className={sub}>{exp.location}</span>
              </div>
              <div className="space-y-4 pl-2 border-l-2 border-gray-100 ml-1">
                {exp.roles.map(role => (
                  <div key={role.id} className="relative">
                     <div className="flex justify-between items-baseline">
                      <h3 className={h3}>{role.title}</h3>
                      <span className={sub}>{role.startDate} – {role.current ? 'Present' : role.endDate}</span>
                    </div>
                    <div className={p}>
                      <MarkdownRenderer>{role.description}</MarkdownRenderer>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null
  );

  const Education = () => (
    data.education.length > 0 ? (
      <section>
        <h2 className={h2} style={{...primaryColorStyle, ...borderColorStyle}}>Education</h2>
        <div className="space-y-3">
          {data.education.map(edu => (
            <div key={edu.id}>
              <div className="flex justify-between items-baseline">
                <h3 className={h3}>{edu.school}</h3>
                <span className={sub}>{edu.startDate} – {edu.endDate}</span>
              </div>
              <div className="mb-1">
                <span className={p}>{edu.degree} in {edu.field}</span>
              </div>
              {edu.notes && <p className={`${sub} italic`}>{edu.notes}</p>}
            </div>
          ))}
        </div>
      </section>
    ) : null
  );

  const Skills = () => (
    data.skills.length > 0 ? (
      <section>
        <h2 className={h2} style={{...primaryColorStyle, ...borderColorStyle}}>Skills</h2>
        <div className="space-y-2">
          {data.skills.map(skill => (
            <div key={skill.id} className="flex flex-col sm:flex-row sm:items-baseline gap-2">
              <span className={`${h3} w-32 shrink-0`}>{skill.name}:</span>
              <span className={p}>{skill.items.filter(s => s.trim().length > 0).join(', ')}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null
  );

  const Projects = () => (
    data.projects.length > 0 ? (
      <section>
        <h2 className={h2} style={{...primaryColorStyle, ...borderColorStyle}}>Projects</h2>
        <div className="space-y-3">
          {data.projects.map(proj => (
            <div key={proj.id}>
              <div className="flex justify-between items-baseline">
                <h3 className={h3}>{proj.name}</h3>
                {proj.link && <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} className={`${link} text-xs`} target="_blank" rel="noreferrer">{proj.link}</a>}
              </div>
              <div className={p}>
                <MarkdownRenderer>{proj.description}</MarkdownRenderer>
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null
  );

  if (layout === 'modern-sidebar') {
    const sidebarBg = data.customColor || '#0f172a'; // slate-900 hex
    const containerStyle = {
      background: `linear-gradient(to right, ${sidebarBg} 0%, ${sidebarBg} 33.3333%, white 33.3333%, white 100%)`,
      minHeight: '1123px' // Ensure at least one A4 page
    };

    return (
      <div className="grid grid-cols-12 h-full" style={containerStyle}>
        {/* Sidebar */}
        <div className="col-span-4 text-white p-8 flex flex-col gap-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold tracking-tight mb-2 leading-tight">{data.header.fullName}</h1>
            <p className="text-slate-400 font-medium uppercase tracking-widest text-xs">{data.header.headline}</p>
          </div>

          <div className="space-y-3 text-sm text-slate-300">
             {data.header.email && <div className="flex items-center gap-2 break-all"><span className="opacity-70">✉</span> <a href={`mailto:${data.header.email}`} className="hover:text-white transition-colors">{data.header.email}</a></div>}
             {data.header.phone && <div className="flex items-center gap-2"><span className="opacity-70">☏</span> <a href={`tel:${data.header.phone}`} className="hover:text-white transition-colors">{data.header.phone}</a></div>}
             {data.header.location && <div className="flex items-center gap-2"><span className="opacity-70">📍</span> {data.header.location}</div>}
             {data.header.website && <div className="flex items-center gap-2"><span className="opacity-70">🌐</span> <a href={data.header.website.startsWith('http') ? data.header.website : `https://${data.header.website}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{data.header.website.replace(/^https?:\/\//, '')}</a></div>}
             {data.header.linkedin && <div className="flex items-center gap-2"><Linkedin size={14} className="opacity-70" /> <a href={data.header.linkedin.startsWith('http') ? data.header.linkedin : `https://${data.header.linkedin}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{data.header.linkedin.replace(/^https?:\/\//, '')}</a></div>}
             {data.header.github && <div className="flex items-center gap-2"><Github size={14} className="opacity-70" /> <a href={data.header.github.startsWith('http') ? data.header.github : `https://${data.header.github}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">{data.header.github.replace(/^https?:\/\//, '')}</a></div>}
          </div>

          {data.skills.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Skills</h3>
              <div className="space-y-4">
                {data.skills.map(skill => (
                  <div key={skill.id}>
                    <div className="font-semibold text-slate-200 mb-1 text-sm">{skill.name}</div>
                    <div className="block">
                      {skill.items.map(item => (
                        <span key={item} className="inline-block bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs leading-none whitespace-nowrap mr-2 mb-2 align-middle">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-800 pb-2">Education</h3>
              <div className="space-y-4">
                {data.education.map(edu => (
                  <div key={edu.id}>
                    <div className="font-bold text-white text-sm">{edu.school}</div>
                    <div className="text-slate-400 text-xs mb-1">{edu.degree} in {edu.field}</div>
                    <div className="text-slate-500 text-xs italic">{edu.startDate} – {edu.endDate}</div>
                    {edu.notes && <div className="text-slate-500 text-xs mt-1">{edu.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="col-span-8 p-10 text-slate-800 space-y-8 bg-white">
          {data.summary && (
            <section>
              <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-2 mb-4" style={{...primaryColorStyle, ...borderColorStyle}}>Profile</h2>
              <div className="text-sm leading-relaxed text-slate-600">
                <MarkdownRenderer>{data.summary}</MarkdownRenderer>
              </div>
            </section>
          )}

          {data.experience.length > 0 && (
            <section>
              <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-2 mb-6" style={{...primaryColorStyle, ...borderColorStyle}}>Experience</h2>
              <div className="space-y-8">
                {data.experience.map(exp => (
                  <div key={exp.id} className="relative">
                    <div className="flex justify-between items-baseline mb-2">
                       <div className="text-md font-bold text-slate-700">{exp.company}</div>
                       <div className="text-sm text-slate-500">{exp.location}</div>
                    </div>
                    
                    <div className="space-y-6 pl-4 border-l-2 border-slate-100 ml-1">
                      {exp.roles.map(role => (
                        <div key={role.id} className="relative">
                          <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-300" style={bgColorStyle}></div>
                          <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-bold text-slate-900" style={primaryColorStyle}>{role.title}</h3>
                            <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{role.startDate} – {role.current ? 'Present' : role.endDate}</span>
                          </div>
                          <div className="text-sm text-slate-600 leading-relaxed">
                            <MarkdownRenderer>{role.description}</MarkdownRenderer>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.projects.length > 0 && (
            <section>
              <h2 className="text-lg font-bold uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-2 mb-4" style={{...primaryColorStyle, ...borderColorStyle}}>Projects</h2>
              <div className="grid grid-cols-1 gap-4">
                {data.projects.map(proj => (
                  <div key={proj.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-800 text-sm" style={primaryColorStyle}>{proj.name}</h3>
                      {proj.link && <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1" style={primaryColorStyle} target="_blank" rel="noreferrer"><ExternalLink size={10} /> {proj.link}</a>}
                    </div>
                    <div className="text-sm text-slate-600">
                      <MarkdownRenderer>{proj.description}</MarkdownRenderer>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // Layout Switcher
  if (layout === 'two-column-left') {
    return (
      <div className={`grid grid-cols-12 gap-8 h-full ${template.colors.bg} p-8 min-h-[1123px]`}>
        <div className="col-span-4 border-r pr-6 space-y-6">
           <div className="mb-8">
             <h1 className={`${fontHeadings} text-2xl ${colors.primary} font-bold break-words`}>{data.header.fullName}</h1>
             <p className={`${sub} text-sm mt-2`}>{data.header.headline}</p>
             <div className="mt-4 flex flex-col gap-1 text-xs break-words">
                {data.header.email && <a href={`mailto:${data.header.email}`} className="hover:underline">{data.header.email}</a>}
                {data.header.phone && <a href={`tel:${data.header.phone}`} className="hover:underline">{data.header.phone}</a>}
                {data.header.location && <span>{data.header.location}</span>}
                {data.header.website && <a href={data.header.website.startsWith('http') ? data.header.website : `https://${data.header.website}`} target="_blank" rel="noreferrer" className="opacity-75 hover:underline">{data.header.website.replace(/^https?:\/\//, '')}</a>}
             </div>
           </div>
           <Skills />
           <Education />
        </div>
        <div className="col-span-8 space-y-2">
           <Summary />
           <Experience />
           <Projects />
        </div>
      </div>
    );
  }

  if (layout === 'two-column-right') {
    return (
      <div className={`grid grid-cols-12 gap-8 h-full ${template.colors.bg} p-8 min-h-[1123px]`}>
        <div className="col-span-8 space-y-2">
           <div className="mb-8 border-b pb-4">
             <h1 className={`${fontHeadings} text-4xl ${colors.primary}`}>{data.header.fullName}</h1>
             <p className={`${fontBody} text-xl mt-2 text-gray-600`}>{data.header.headline}</p>
           </div>
           <Summary />
           <Experience />
           <Projects />
        </div>
        <div className="col-span-4 bg-opacity-50 space-y-6 pl-4 border-l">
           <div className="text-sm space-y-1 mb-8">
              {data.header.email && <div className="font-semibold"><a href={`mailto:${data.header.email}`} className="hover:underline">{data.header.email}</a></div>}
              {data.header.phone && <div><a href={`tel:${data.header.phone}`} className="hover:underline">{data.header.phone}</a></div>}
              {data.header.location && <div>{data.header.location}</div>}
              {data.header.linkedin && <a href={data.header.linkedin.startsWith('http') ? data.header.linkedin : `https://${data.header.linkedin}`} target="_blank" rel="noreferrer" className="text-blue-600 block truncate hover:underline">LinkedIn</a>}
           </div>
           <Skills />
           <Education />
        </div>
      </div>
    );
  }

  // Default: Single Column
  return (
    <div className={`h-full ${template.colors.bg} p-10 min-h-[1123px]`}>
      <Header />
      <Summary />
      <Skills />
      <Experience />
      <Education />
      <Projects />
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [resume, setResume] = useState<ResumeData>(INITIAL_RESUME);
  const [templateId, setTemplateId] = useState<string>('ats-classic');
  const [atsMode, setAtsMode] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('header');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [scale, setScale] = useState(0.8);
  
  // Ref for the print container
  const printRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('cv-forge-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Convert flat experience to roles
        if (parsed.experience && parsed.experience.length > 0 && !parsed.experience[0].roles) {
            parsed.experience = parsed.experience.map((exp: any) => ({
              id: exp.id,
              company: exp.company,
              location: exp.location || '',
              roles: [{
                id: crypto.randomUUID(),
                title: exp.role || '',
                startDate: exp.startDate || '',
                endDate: exp.endDate || '',
                current: exp.current || false,
                description: exp.description || ''
              }]
            }));
        }
        setResume(parsed);
      } catch (e) { console.error("Failed to load save", e); }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem('cv-forge-data', JSON.stringify(resume));
    }, 1000);
    return () => clearTimeout(handler);
  }, [resume]);

  const activeTemplate = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];

  const handlePrint = () => {
    const element = printRef.current;
    if (!element) {
      console.error("Print element not found");
      return;
    }

    setIsPrinting(true);
    console.log("Starting PDF generation...");
    
    try {
      // Clone the element to remove the "page break estimate" lines for the PDF
      const clone = element.cloneNode(true) as HTMLElement;
      const markers = clone.querySelectorAll('[title="Page Break Estimate"]');
      markers.forEach(m => m.remove());

      // Fix: Ensure the clone height is a multiple of A4 page height so background extends to the bottom
      // We append the clone to the body (hidden) to get an accurate scrollHeight without the markers
      clone.style.position = 'absolute';
      clone.style.left = '-10000px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      // A4 aspect ratio is 210mm / 297mm = ~0.707
      // We use the clientWidth to calculate the expected page height in pixels
      const pageWidth = clone.clientWidth;
      const pageHeight = pageWidth * (297 / 210); // A4 height in px based on width
      
      const contentHeight = clone.scrollHeight;
      const totalPages = Math.ceil(contentHeight / pageHeight);
      
      // Set height to exactly the number of pages needed
      const targetHeight = totalPages * pageHeight;
      
      // Apply the new height to the clone
      clone.style.height = `${targetHeight}px`;
      clone.style.minHeight = `${targetHeight}px`;

      const opt = {
        margin: 0,
        filename: `${resume.title.replace(/\s+/g, '_') || 'resume'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        enableLinks: true
      };

      html2pdf().set(opt).from(clone).save().then(() => {
        console.log("PDF generated successfully");
        document.body.removeChild(clone);
        setIsPrinting(false);
      }).catch((err: any) => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(clone);
        alert("PDF generation failed. Please check console for details.");
        setIsPrinting(false);
      });
    } catch (err) {
      console.error("Error in handlePrint:", err);
      alert("An error occurred while generating PDF.");
      setIsPrinting(false);
    }
  };

  const handleAI = async (text: string, fieldPath: string, type: 'fix' | 'professional' | 'shorten') => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsAiLoading(true);
    try {
      const newText = await improveText(apiKey, text, type);
      if (fieldPath === 'summary') {
        setResume(prev => ({ ...prev, summary: newText }));
      } else {
        alert("AI Suggestion:\n\n" + newText);
      }
    } catch (e) {
      alert("AI Failed. Check API Key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const atsIssues = [];
  if (atsMode && !activeTemplate.isATS) atsIssues.push("Current template is not ATS friendly.");
  if (!resume.header.email) atsIssues.push("Missing email address.");
  if (!resume.header.phone) atsIssues.push("Missing phone number.");
  if (resume.summary.length < 50) atsIssues.push("Summary is too short.");

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden text-gray-800">
      
      {/* Top Bar */}
      <header className="app-header h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">CV</div>
          <input 
            value={resume.title} 
            onChange={e => setResume({...resume, title: e.target.value})}
            className="font-semibold text-lg bg-transparent hover:bg-gray-50 px-2 py-1 rounded focus:outline-none focus:ring-1 ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-4">
           {/* JSON Import/Export */}
          <div className="flex items-center gap-2 mr-2 border-r pr-4 border-gray-200">
            <label className="cursor-pointer text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100" title="Import JSON">
              <Upload size={18} />
              <input 
                type="file" 
                className="hidden" 
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const json = JSON.parse(ev.target?.result as string);
                        setResume(json);
                      } catch (err) {
                        alert('Invalid JSON file');
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
              />
            </label>
            <button 
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resume, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "resume.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
              }}
              className="text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100"
              title="Export JSON"
            >
              <Save size={18} />
            </button>
          </div>

          {/* ATS Toggle */}
          <button 
            onClick={() => {
              setAtsMode(!atsMode);
              if (!atsMode) setTemplateId('ats-classic'); // Force a safe template
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${atsMode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <CheckCircle size={16} />
            ATS Mode: {atsMode ? 'ON' : 'OFF'}
          </button>

          {/* Color Picker */}
          <div className="flex items-center gap-2 ml-2">
            <label className="text-xs font-medium text-gray-500">Theme:</label>
            <input 
              type="color" 
              value={resume.customColor || '#000000'}
              onChange={(e) => setResume({...resume, customColor: e.target.value})}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              title="Change Theme Color"
            />
          </div>
          
          {/* API Key Button (Hidden if valid, usually) */}
          <button onClick={() => setShowApiKeyModal(true)} className="text-gray-400 hover:text-gray-600">
            <Settings size={20} />
          </button>

          <button 
            onClick={handlePrint} 
            disabled={isPrinting}
            className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm font-medium transition-colors ${isPrinting ? 'opacity-75 cursor-wait' : ''}`} 
            type="button"
          >
            {isPrinting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Generating...
              </>
            ) : (
              <>
                <Download size={18} /> Export PDF
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* LEFT: Editor Panel */}
        <div className="editor-sidebar w-[450px] bg-white border-r flex flex-col overflow-y-auto custom-scrollbar z-10">
          
          {/* Header Section */}
          <div className="border-b">
            <SectionHeader title="Personal Details" icon={FileText} isOpen={activeSection === 'header'} toggle={() => setActiveSection(activeSection === 'header' ? null : 'header')} />
            {activeSection === 'header' && (
              <div className="p-4 bg-gray-50 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                   <InputGroup label="Full Name" value={resume.header.fullName} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, fullName: v}}))} />
                   <InputGroup label="Job Title" value={resume.header.headline} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, headline: v}}))} />
                </div>
                <InputGroup label="Email" value={resume.header.email} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, email: v}}))} />
                <InputGroup label="Phone" value={resume.header.phone} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, phone: v}}))} />
                <InputGroup label="Location" value={resume.header.location} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, location: v}}))} />
                <InputGroup label="Website" value={resume.header.website} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, website: v}}))} />
                <div className="grid grid-cols-2 gap-3">
                   <InputGroup label="LinkedIn (URL)" value={resume.header.linkedin} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, linkedin: v}}))} />
                   <InputGroup label="GitHub (URL)" value={resume.header.github} onChange={(v: string) => setResume(p => ({...p, header: {...p.header, github: v}}))} />
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="border-b">
            <SectionHeader title="Professional Summary" icon={Layout} isOpen={activeSection === 'summary'} toggle={() => setActiveSection(activeSection === 'summary' ? null : 'summary')} />
            {activeSection === 'summary' && (
              <div className="p-4 bg-gray-50">
                <TextAreaGroup 
                  label="Summary" 
                  value={resume.summary} 
                  onChange={(v: string) => setResume(p => ({...p, summary: v}))} 
                  onAi={(type: any) => handleAI(resume.summary, 'summary', type)}
                  isAiLoading={isAiLoading}
                />
              </div>
            )}
          </div>

          {/* Experience Section */}
          <div className="border-b">
            <SectionHeader title="Experience" icon={GripVertical} isOpen={activeSection === 'experience'} toggle={() => setActiveSection(activeSection === 'experience' ? null : 'experience')} />
            {activeSection === 'experience' && (
              <div className="p-4 bg-gray-50 space-y-6">
                {resume.experience.map((exp, idx) => (
                  <div key={exp.id} className="bg-white p-4 rounded border shadow-sm relative group">
                    <button 
                      onClick={() => {
                        const newExp = resume.experience.filter(e => e.id !== exp.id);
                        setResume({...resume, experience: newExp});
                      }}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Delete Company"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="mb-4 border-b pb-4">
                        <InputGroup label="Company" value={exp.company} onChange={(v: string) => {
                        const list = [...resume.experience]; list[idx].company = v; setResume({...resume, experience: list});
                        }} />
                        <InputGroup label="Location" value={exp.location} onChange={(v: string) => {
                        const list = [...resume.experience]; list[idx].location = v; setResume({...resume, experience: list});
                        }} />
                    </div>

                    <div className="space-y-6 pl-3 border-l-2 border-blue-100">
                        {exp.roles.map((role, rIdx) => (
                            <div key={role.id} className="relative group/role">
                                <button 
                                    onClick={() => {
                                        const list = [...resume.experience];
                                        list[idx].roles = list[idx].roles.filter(r => r.id !== role.id);
                                        setResume({...resume, experience: list});
                                    }}
                                    className="absolute top-0 right-0 text-gray-300 hover:text-red-500 opacity-0 group-hover/role:opacity-100 transition-opacity"
                                    title="Delete Role"
                                >
                                    <Trash2 size={14} />
                                </button>
                                <InputGroup label="Role Title" value={role.title} onChange={(v: string) => {
                                    const list = [...resume.experience]; list[idx].roles[rIdx].title = v; setResume({...resume, experience: list});
                                }} />
                                <div className="grid grid-cols-2 gap-2">
                                    <InputGroup label="Start" value={role.startDate} placeholder="YYYY-MM" onChange={(v: string) => {
                                        const list = [...resume.experience]; list[idx].roles[rIdx].startDate = v; setResume({...resume, experience: list});
                                    }} />
                                    <InputGroup label="End" value={role.endDate} placeholder="YYYY-MM" onChange={(v: string) => {
                                        const list = [...resume.experience]; list[idx].roles[rIdx].endDate = v; setResume({...resume, experience: list});
                                    }} />
                                </div>
                                <TextAreaGroup label="Description" value={role.description} rows={5} onChange={(v: string) => {
                                    const list = [...resume.experience]; list[idx].roles[rIdx].description = v; setResume({...resume, experience: list});
                                }} />
                            </div>
                        ))}
                        <button 
                            onClick={() => {
                                const list = [...resume.experience];
                                list[idx].roles.push({ id: crypto.randomUUID(), title: 'New Role', startDate: '', endDate: '', current: false, description: '' });
                                setResume({...resume, experience: list});
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                            <Plus size={12} /> Add Role
                        </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setResume({...resume, experience: [...resume.experience, { id: crypto.randomUUID(), company: 'New Company', location: '', roles: [{ id: crypto.randomUUID(), title: 'Role', startDate: '', endDate: '', current: false, description: '' }] }]})}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex justify-center items-center gap-2 font-medium"
                >
                  <Plus size={16} /> Add Company
                </button>
              </div>
            )}
          </div>

          {/* Education Section */}
          <div className="border-b">
            <SectionHeader title="Education" icon={GraduationCap} isOpen={activeSection === 'education'} toggle={() => setActiveSection(activeSection === 'education' ? null : 'education')} />
            {activeSection === 'education' && (
              <div className="p-4 bg-gray-50 space-y-4">
                {resume.education.map((edu, idx) => (
                  <div key={edu.id} className="bg-white p-3 rounded border shadow-sm relative group">
                    <button 
                      onClick={() => {
                        const newEdu = resume.education.filter(e => e.id !== edu.id);
                        setResume({...resume, education: newEdu});
                      }}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <InputGroup label="School / University" value={edu.school} onChange={(v: string) => {
                      const list = [...resume.education]; list[idx].school = v; setResume({...resume, education: list});
                    }} />
                    <div className="grid grid-cols-2 gap-2">
                        <InputGroup label="Degree" value={edu.degree} onChange={(v: string) => {
                        const list = [...resume.education]; list[idx].degree = v; setResume({...resume, education: list});
                        }} />
                        <InputGroup label="Field of Study" value={edu.field} onChange={(v: string) => {
                        const list = [...resume.education]; list[idx].field = v; setResume({...resume, education: list});
                        }} />
                    </div>
                    <InputGroup label="Location" value={edu.location} onChange={(v: string) => {
                      const list = [...resume.education]; list[idx].location = v; setResume({...resume, education: list});
                    }} />
                    <div className="grid grid-cols-2 gap-2">
                      <InputGroup label="Start Date" value={edu.startDate} placeholder="YYYY-MM" onChange={(v: string) => {
                        const list = [...resume.education]; list[idx].startDate = v; setResume({...resume, education: list});
                      }} />
                      <InputGroup label="End Date" value={edu.endDate} placeholder="YYYY-MM" onChange={(v: string) => {
                        const list = [...resume.education]; list[idx].endDate = v; setResume({...resume, education: list});
                      }} />
                    </div>
                    <TextAreaGroup label="Notes (e.g. GPA, Honors)" value={edu.notes} rows={2} onChange={(v: string) => {
                        const list = [...resume.education]; list[idx].notes = v; setResume({...resume, education: list});
                    }} />
                  </div>
                ))}
                <button 
                  onClick={() => setResume({...resume, education: [...resume.education, { id: crypto.randomUUID(), school: 'University Name', degree: 'Degree', field: 'Field', location: '', startDate: '', endDate: '', notes: '' }]})}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex justify-center items-center gap-2 font-medium"
                >
                  <Plus size={16} /> Add Education
                </button>
              </div>
            )}
          </div>

           {/* Skills Section */}
           <div className="border-b">
            <SectionHeader title="Skills" icon={Wand2} isOpen={activeSection === 'skills'} toggle={() => setActiveSection(activeSection === 'skills' ? null : 'skills')} />
            {activeSection === 'skills' && (
              <div className="p-4 bg-gray-50 space-y-4">
                {resume.skills.map((skill, idx) => (
                  <div key={skill.id} className="bg-white p-3 rounded border shadow-sm relative group">
                     <button 
                      onClick={() => {
                        const list = resume.skills.filter(s => s.id !== skill.id);
                        setResume({...resume, skills: list});
                      }}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <InputGroup label="Category (e.g. Languages)" value={skill.name} onChange={(v: string) => {
                      const list = [...resume.skills]; list[idx].name = v; setResume({...resume, skills: list});
                    }} />
                    <TextAreaGroup label="Items (comma separated)" value={skill.items.join(', ')} rows={2} onChange={(v: string) => {
                      // Allow spaces in tags, split by comma
                      const list = [...resume.skills]; 
                      list[idx].items = v.split(',').map(s => s.trim()); 
                      setResume({...resume, skills: list});
                    }} />
                  </div>
                ))}
                 <button 
                  onClick={() => setResume({...resume, skills: [...resume.skills, { id: crypto.randomUUID(), name: 'New Category', items: [] }]})}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex justify-center items-center gap-2 font-medium"
                >
                  <Plus size={16} /> Add Skill Group
                </button>
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div className="border-b">
            <SectionHeader title="Projects" icon={Layout} isOpen={activeSection === 'projects'} toggle={() => setActiveSection(activeSection === 'projects' ? null : 'projects')} />
            {activeSection === 'projects' && (
              <div className="p-4 bg-gray-50 space-y-4">
                {resume.projects.map((proj, idx) => (
                  <div key={proj.id} className="bg-white p-3 rounded border shadow-sm relative group">
                    <button 
                      onClick={() => {
                        const newProj = resume.projects.filter(p => p.id !== proj.id);
                        setResume({...resume, projects: newProj});
                      }}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <InputGroup label="Project Name" value={proj.name} onChange={(v: string) => {
                      const list = [...resume.projects]; list[idx].name = v; setResume({...resume, projects: list});
                    }} />
                    <InputGroup label="Link" value={proj.link} onChange={(v: string) => {
                      const list = [...resume.projects]; list[idx].link = v; setResume({...resume, projects: list});
                    }} />
                    <TextAreaGroup label="Description" value={proj.description} rows={3} onChange={(v: string) => {
                        const list = [...resume.projects]; list[idx].description = v; setResume({...resume, projects: list});
                    }} />
                  </div>
                ))}
                <button 
                  onClick={() => setResume({...resume, projects: [...resume.projects, { id: crypto.randomUUID(), name: 'New Project', link: '', description: '' }]})}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex justify-center items-center gap-2 font-medium"
                >
                  <Plus size={16} /> Add Project
                </button>
              </div>
            )}
          </div>
          
           {/* Template Selector (in Panel for simplicity) */}
           <div className="p-4 bg-gray-100 border-t mt-auto">
             <h3 className="font-semibold text-sm text-gray-700 mb-3">Choose Template</h3>
             <div className="grid grid-cols-2 gap-2">
               {TEMPLATES.filter(t => !atsMode || t.isATS).map(t => (
                 <button 
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left p-2 rounded border text-xs flex flex-col items-center gap-1 transition-all ${templateId === t.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                 >
                   <div className="w-full h-16 bg-gray-200 rounded overflow-hidden">
                     <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover opacity-80" />
                   </div>
                   <span className="font-medium truncate w-full text-center">{t.name}</span>
                 </button>
               ))}
             </div>
           </div>

        </div>

        {/* RIGHT: Preview Panel */}
        <div className="preview-panel flex-1 bg-gray-800 relative flex flex-col items-center justify-start overflow-hidden">
          
          {/* Toolbar */}
          <div className="preview-toolbar w-full h-12 bg-gray-700 flex items-center justify-between px-4 text-white text-sm shrink-0 z-10">
             <div className="flex items-center gap-4">
               <span>Preview Scale: {Math.round(scale * 100)}%</span>
               <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="hover:bg-gray-600 p-1 rounded"><ChevronDown size={14}/></button>
               <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="hover:bg-gray-600 p-1 rounded"><ChevronUp size={14}/></button>
             </div>
             {atsIssues.length > 0 && (
               <div className="flex items-center gap-2 text-yellow-400">
                 <AlertTriangle size={14} />
                 <span>{atsIssues.length} ATS Improvement(s)</span>
               </div>
             )}
          </div>

          {/* Scrollable Canvas */}
          <div className="flex-1 w-full overflow-auto p-8 flex justify-center items-start custom-scrollbar">
            <div 
              style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              className="preview-scaler transition-transform duration-200"
            >
              {/* Paper Container */}
              <div 
                ref={printRef}
                className="print-container bg-white shadow-2xl mx-auto overflow-hidden relative" 
                style={{ width: '210mm', minHeight: '297mm' }}
              >
                {/* Visual Page Break Marker (for preview only) */}
                <div className="absolute top-[297mm] left-0 w-full border-b-2 border-dashed border-red-300 z-50 print:hidden pointer-events-none opacity-50" title="Page Break Estimate"></div>
                <div className="absolute top-[594mm] left-0 w-full border-b-2 border-dashed border-red-300 z-50 print:hidden pointer-events-none opacity-50" title="Page Break Estimate"></div>
                
                <ResumeRenderer data={resume} template={activeTemplate} />
                
                {/* Print Footer Watermark (Optional, remove in production) */}
                <div className="absolute bottom-4 right-4 text-[10px] text-gray-300 print:hidden">
                  Built with CV Forge
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </main>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="ai-settings-modal fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">AI Settings</h2>
            <p className="text-sm text-gray-600 mb-4">
              To use AI features like rewriting bullets, please enter your Gemini API Key.
              It is stored only in your browser memory for this session.
            </p>
            <input 
              type="password"
              className="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter Gemini API Key"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Close</button>
              <button onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            </div>
            <div className="mt-4 text-xs text-center text-gray-500">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-blue-600">Get an API Key here</a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;