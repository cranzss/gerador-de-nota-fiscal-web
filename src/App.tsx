/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  FileText,
  Layers,
  Calendar,
  MapPin,
  Building2,
  ExternalLink,
  Info,
  Hash,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sliders,
  HelpCircle
} from 'lucide-react';

// Brazilian States and IBGE Codes
const UF_CODES: Record<string, string> = {
  "AC": "12", "AL": "27", "AP": "16", "AM": "13", "BA": "29", "CE": "23",
  "DF": "53", "ES": "32", "GO": "52", "MA": "21", "MT": "51", "MS": "50",
  "MG": "31", "PA": "15", "PB": "25", "PR": "41", "PE": "26", "PI": "22",
  "RJ": "33", "RN": "24", "RS": "43", "RO": "11", "RR": "14", "SC": "42",
  "SP": "35", "SE": "28", "TO": "17"
};

const STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" }
].sort((a, b) => a.name.localeCompare(b.name));

// Helper to calculate CNPJ DVs using modulo 11 with ASCII - 48 conversion to support alphanumeric characters
function calculateCNPJDVs(base12: string): { dv1: number; dv2: number } {
  const digits = base12.split('').map(char => {
    const code = char.toUpperCase().charCodeAt(0);
    return code - 48;
  });

  // Weights for first DV
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma1 = 0;
  for (let i = 0; i < 12; i++) {
    soma1 += digits[i] * w1[i];
  }
  let dv1 = soma1 % 11;
  dv1 = dv1 < 2 ? 0 : 11 - dv1;

  // Weights for second DV
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma2 = 0;
  for (let i = 0; i < 12; i++) {
    soma2 += digits[i] * w2[i];
  }
  soma2 += dv1 * 2;
  
  let dv2 = soma2 % 11;
  dv2 = dv2 < 2 ? 0 : 11 - dv2;

  return { dv1, dv2 };
}

// CNPJ Generator Algorithm matching original C# exactly
function generateValidCNPJ(): string {
  const rnd = () => Math.floor(Math.random() * 10);
  const n1 = rnd();
  const n2 = rnd();
  const n3 = rnd();
  const n4 = rnd();
  const n5 = rnd();
  const n6 = rnd();
  const n7 = rnd();
  const n8 = rnd();
  const n9 = 0;
  const n10 = 0;
  const n11 = 0;
  const n12 = 1;

  const soma1 = n1 * 5 + n2 * 4 + n3 * 3 + n4 * 2 + n5 * 9 + n6 * 8 + n7 * 7 + n8 * 6 + n9 * 5 + n10 * 4 + n11 * 3 + n12 * 2;
  let dv1 = soma1 % 11;
  dv1 = dv1 < 2 ? 0 : 11 - dv1;

  const soma2 = n1 * 6 + n2 * 5 + n3 * 4 + n4 * 3 + n5 * 2 + n6 * 9 + n7 * 8 + n8 * 7 + n9 * 6 + n10 * 5 + n11 * 4 + n12 * 3 + dv1 * 2;
  let dv2 = soma2 % 11;
  dv2 = dv2 < 2 ? 0 : 11 - dv2;

  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${n10}${n11}${n12}${dv1}${dv2}`;
}

// Generates a valid alphanumeric CNPJ conforming to the new RFB rules
function generateValidAlphanumericCNPJ(): string {
  const alphaChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let base12 = '';
  for (let i = 0; i < 12; i++) {
    const randIndex = Math.floor(Math.random() * alphaChars.length);
    base12 += alphaChars[randIndex];
  }
  const { dv1, dv2 } = calculateCNPJDVs(base12);
  return `${base12}${dv1}${dv2}`;
}

// Modulo 11 calculation matching the Sefaz rules and supporting alphanumeric characters (ASCII - 48 conversion)
function calculateDV(key43: string): number {
  let weight = 2;
  let sum = 0;
  for (let i = key43.length - 1; i >= 0; i--) {
    const char = key43[i].toUpperCase();
    const code = char.charCodeAt(0);
    const value = code - 48;
    sum += value * weight;
    weight++;
    if (weight > 9) {
      weight = 2;
    }
  }
  const remainder = sum % 11;
  const dv = 11 - remainder;
  return dv > 9 ? 0 : dv;
}

// Formatting utilities
function formatCNPJ(val: string, isAlphanumeric: boolean = false): string {
  const regex = isAlphanumeric ? /[^A-Za-z0-9]/g : /[^0-9]/g;
  const clean = val.replace(regex, '').toUpperCase().slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

function formatKey(key: string): string {
  const clean = key.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 44);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join(' ');
}

interface KeyHistoryItem {
  key: string;
  uf: string;
  cnpj: string;
  number: string;
  timestamp: Date;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'generator' | 'validator'>('generator');

  // Generator States
  const [uf, setUf] = useState<string>('');
  const [cnpj, setCnpj] = useState<string>('');
  const [isAlphanumeric, setIsAlphanumeric] = useState<boolean>(false);
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yy}${mm}`;
  });
  const [model, setModel] = useState<string>('55');
  const [series, setSeries] = useState<string>('');
  const [nfNumber, setNfNumber] = useState<string>('');
  const [numericCode, setNumericCode] = useState<string>('');
  const [emissionType, setEmissionType] = useState<string>('1');

  // Generator Outputs
  const [generatedKey, setGeneratedKey] = useState<string>('');
  const [finalNfNumber, setFinalNfNumber] = useState<string>('');
  const [finalSeries, setFinalSeries] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<KeyHistoryItem[]>([]);

  // Validator States
  const [inputKey, setInputKey] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    parsed?: {
      uf: string;
      ufName: string;
      date: string;
      cnpj: string;
      model: string;
      series: string;
      number: string;
      emissionType: string;
      numericCode: string;
      dv: string;
    };
  } | null>(null);

  // Auto-format or filter current CNPJ value when alphanumeric flag changes
  useEffect(() => {
    if (!isAlphanumeric) {
      setCnpj('');
    } else {
      setCnpj(prev => formatCNPJ(prev, isAlphanumeric));
    }
  }, [isAlphanumeric]);

  const regenerateRandomFields = () => {
    // Generate Serie (1 to 3 digits)
    const randomSeriesNum = Math.floor(Math.random() * 999) + 1;
    const randomSeries = String(randomSeriesNum).padStart(3, '0');
    setSeries(randomSeries);

    // Generate NF Number (4 to 7 digits padded to 9)
    const randomDigitsCount = Math.floor(Math.random() * 4) + 4; // 4 to 7
    const minNum = Math.pow(10, randomDigitsCount - 1);
    const maxNum = Math.pow(10, randomDigitsCount) - 1;
    const randomNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
    const randomNfStr = String(randomNum).padStart(9, '0');
    setNfNumber(randomNfStr);

    // Generate Numeric Code (8 digits)
    let randomCod = '';
    for (let i = 0; i < 8; i++) {
      randomCod += Math.floor(Math.random() * 10);
    }
    setNumericCode(randomCod);

    return {
      series: randomSeries,
      nfNumber: randomNfStr,
      numericCode: randomCod
    };
  };

  const handleGenerateCNPJ = () => {
    const freshCnpj = isAlphanumeric ? generateValidAlphanumericCNPJ() : generateValidCNPJ();
    setCnpj(formatCNPJ(freshCnpj, isAlphanumeric));
  };

  const handleGenerate = () => {
    setErrorMsg('');
    const activeUf = uf;
    const cleanCnpj = cnpj.replace(isAlphanumeric ? /[^A-Za-z0-9]/g : /\D/g, '').toUpperCase();

    if (!activeUf) {
      setErrorMsg('Por favor, selecione uma UF válida.');
      return;
    }

    if (!cleanCnpj || cleanCnpj.length !== 14) {
      setErrorMsg(`Por favor, insira um CNPJ válido com 14 ${isAlphanumeric ? 'caracteres alfanuméricos' : 'dígitos'} (ou clique em "Gerar CNPJ Válido").`);
      return;
    }

    const ufCod = UF_CODES[activeUf];
    if (!ufCod) {
      setErrorMsg('Código de UF não encontrado.');
      return;
    }

    // Generate fresh values for Series, NF Number and Numeric Code automatically
    const randomVals = regenerateRandomFields();

    const finalDate = date.replace(/\D/g, '').slice(0, 4) || '2607';
    const finalModel = model.replace(/\D/g, '').slice(0, 2) || '55';

    // 43-digit base key (can contain letters if CNPJ is alphanumeric)
    const baseKey = ufCod + finalDate + cleanCnpj + finalModel + randomVals.series + randomVals.nfNumber + emissionType + randomVals.numericCode;

    if (baseKey.length !== 43) {
      setErrorMsg(`A chave base possui tamanho inválido (${baseKey.length}/43 caracteres). Verifique os campos.`);
      return;
    }

    const dv = calculateDV(baseKey);
    const fullKey = baseKey + dv;

    setGeneratedKey(fullKey);
    setFinalNfNumber(randomVals.nfNumber.replace(/^0+/, '') || '0');
    setFinalSeries(randomVals.series.replace(/^0+/, '') || '0');

    // Add to history
    const historyItem: KeyHistoryItem = {
      key: fullKey,
      uf: activeUf,
      cnpj: formatCNPJ(cleanCnpj, isAlphanumeric),
      number: randomVals.nfNumber.replace(/^0+/, '') || '0',
      timestamp: new Date()
    };
    setHistory(prev => {
      if (prev.some(item => item.key === fullKey)) return prev;
      return [historyItem, ...prev.slice(0, 4)];
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Validator Handler
  const handleValidate = (val: string) => {
    setInputKey(val);
    const clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (clean.length === 0) {
      setValidationResult(null);
      return;
    }

    if (clean.length !== 44) {
      setValidationResult({
        isValid: false,
        error: `A chave deve conter exatamente 44 caracteres (atualmente possui ${clean.length}).`
      });
      return;
    }

    const ufCod = clean.slice(0, 2);
    const ufEntry = Object.entries(UF_CODES).find(([_, code]) => code === ufCod);
    const stateName = ufEntry ? STATES.find(s => s.uf === ufEntry[0])?.name || ufEntry[0] : 'Código Inválido';
    const stateUf = ufEntry ? ufEntry[0] : '??';

    const yy = clean.slice(2, 4);
    const mm = clean.slice(4, 6);
    const docCnpj = clean.slice(6, 20);
    const docModel = clean.slice(20, 22);
    const docSeries = clean.slice(22, 25);
    const docNumber = clean.slice(25, 34);
    const docEmissionType = clean.slice(34, 35);
    const docNumericCode = clean.slice(35, 43);
    const providedDv = clean.slice(43, 44);

    const baseKey = clean.slice(0, 43);
    const expectedDv = calculateDV(baseKey);
    const isValid = providedDv === String(expectedDv);

    setValidationResult({
      isValid,
      error: isValid ? undefined : `Dígito verificador inválido! Esperado: ${expectedDv}, Informado: ${providedDv}`,
      parsed: {
        uf: stateUf,
        ufName: stateName,
        date: `${mm}/${yy}`,
        cnpj: formatCNPJ(docCnpj, /[A-Za-z]/.test(docCnpj)),
        model: docModel,
        series: String(parseInt(docSeries, 10)),
        number: String(parseInt(docNumber, 10)),
        emissionType: docEmissionType,
        numericCode: docNumericCode,
        dv: providedDv
      }
    });
  };

  // Helper to split generated key into components with labels
  const getKeySegments = () => {
    if (generatedKey.length !== 44) return [];
    return [
      { label: 'UF', val: generatedKey.slice(0, 2), desc: 'Código do Estado (IBGE)', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
      { label: 'AAMM', val: generatedKey.slice(2, 6), desc: 'Ano e Mês de emissão (YYMM)', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
      { label: 'CNPJ', val: generatedKey.slice(6, 20), desc: 'CNPJ do Emitente', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
      { label: 'Mod', val: generatedKey.slice(20, 22), desc: 'Modelo do documento fiscal', color: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100' },
      { label: 'Série', val: generatedKey.slice(22, 25), desc: 'Série do documento', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
      { label: 'Número', val: generatedKey.slice(25, 34), desc: 'Número da Nota Fiscal', color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
      { label: 'TpEmis', val: generatedKey.slice(34, 35), desc: 'Tipo de Emissão (1=Normal)', color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' },
      { label: 'Código', val: generatedKey.slice(35, 43), desc: 'Código Numérico aleatório', color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' },
      { label: 'DV', val: generatedKey.slice(43, 44), desc: 'Dígito Verificador (Módulo 11)', color: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 font-bold' }
    ];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-16" id="root-container">
      
      {/* Decorative top bar */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 w-full" id="decorative-bar" />

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 pt-10 sm:px-6 lg:px-8" id="app-wrapper">
        
        {/* Header */}
        <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6" id="app-header">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-2" id="header-logo-title">
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-600/10" id="icon-bg">
                <FileText className="w-6 h-6" id="header-icon" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="header-title">
                Gerador de Chaves NF-e
              </h1>
            </div>
            <p className="text-slate-500 text-sm max-w-xl" id="header-subtitle">
              Gere e valide chaves de acesso de Notas Fiscais Eletrônicas brasileiras (NF-e Modelo 55 e NFC-e Modelo 65) de forma rápida e 100% offline para testes.
            </p>
          </div>
          
          {/* Creator badge */}
          <a
            href="https://github.com/cranzss"
            target="_blank"
            rel="noopener noreferrer"
            className="self-center sm:self-auto flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600 font-medium transition-all shadow-sm group hover:border-slate-300"
            id="author-link"
          >
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Portado de cranzss
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </a>
        </header>

        {/* Tab Selector */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl max-w-sm mb-8 shadow-inner" id="tab-selector-container">
          <button
            onClick={() => {
              setActiveTab('generator');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-generator"
          >
            Gerador de Chaves
          </button>
          <button
            onClick={() => {
              setActiveTab('validator');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'validator'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="tab-validator"
          >
            Validador / Analisador
          </button>
        </div>

        {/* Tabs Content */}
        {activeTab === 'generator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="generator-tab-content">
            
            {/* Left Column - Form Controls */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm" id="form-card">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4" id="form-card-header">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Parâmetros da NF-e</h2>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-full border border-slate-200">
                  Geração Auto de Nº/Série/Cód.
                </span>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2" id="form-error">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-4" id="form-fields">
                {/* UF Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="select-uf">
                    UF (Estado) <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-uf"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800"
                  >
                    <option value="">Selecione a UF...</option>
                    {STATES.map((state) => (
                      <option key={state.uf} value={state.uf}>
                        {state.uf} - {state.name} (IBGE: {UF_CODES[state.uf]})
                      </option>
                    ))}
                  </select>
                </div>

                {/* CNPJ Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5" id="cnpj-label-row">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor="input-cnpj">
                      CNPJ do Emitente <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-800 select-none" id="is-alphanumeric-label">
                        <input
                          type="checkbox"
                          checked={isAlphanumeric}
                          onChange={(e) => setIsAlphanumeric(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 w-3.5 h-3.5 accent-emerald-600"
                          id="checkbox-is-alphanumeric"
                        />
                        <span>Alfanumérico</span>
                      </label>
                      <span className="text-slate-200" id="divider-cnpj">|</span>
                      <button
                        type="button"
                        onClick={handleGenerateCNPJ}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                        id="btn-generate-cnpj"
                      >
                        Gerar CNPJ Válido
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="input-cnpj"
                    placeholder={isAlphanumeric ? "AB.123.CDE/45FG-H6" : "00.000.000/0001-00"}
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCNPJ(e.target.value, isAlphanumeric))}
                    maxLength={18}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800"
                  />
                </div>

                {/* Date, Model & Emission Type Grid */}
                <div className="grid grid-cols-3 gap-3" id="date-model-emission-grid">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="input-date">
                      Ano/Mês <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="input-date"
                      placeholder="YYMM"
                      value={date}
                      onChange={(e) => setDate(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="select-model">
                      Modelo
                    </label>
                    <select
                      id="select-model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 font-medium"
                    >
                      <option value="55">55 (NF-e)</option>
                      <option value="65">65 (NFC-e)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="select-emission-type">
                      TpEmis
                    </label>
                    <select
                      id="select-emission-type"
                      value={emissionType}
                      onChange={(e) => setEmissionType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 font-mono"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Explicit Manual Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
                id="btn-generate-key"
              >
                Gerar Chave de Acesso
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Column - Results, Copy, History and Breakdown */}
            <div className="lg:col-span-7 flex flex-col gap-6" id="results-column">
              
              {/* Primary Output Panel */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm" id="result-output-card">
                <h3 className="text-sm font-semibold text-slate-900 mb-3.5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Chave de Acesso Gerada
                </h3>

                {generatedKey ? (
                  <div className="space-y-4" id="generated-key-container">
                    
                    {/* Visual Key Group Display */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 relative group" id="key-display-box">
                      <div className="text-slate-400 font-mono text-[10px] uppercase tracking-widest mb-1.5">
                        Chave com 44 Dígitos
                      </div>
                      <div className="font-mono text-base sm:text-lg text-slate-800 tracking-wider font-semibold break-all select-all leading-relaxed" id="formatted-key-display">
                        {formatKey(generatedKey)}
                      </div>
                      
                      <button
                        onClick={() => handleCopy(generatedKey)}
                        className={`absolute right-3.5 top-3.5 p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm ${
                          copied
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                        title="Copiar chave de acesso"
                        id="btn-copy-key"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {/* Standard Secondary Fields (NF Number, Series) equivalent to WinForms textBox3 and textBox4 */}
                    <div className="grid grid-cols-2 gap-4" id="auxiliary-outputs">
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl" id="output-series-card">
                        <div className="text-slate-400 font-mono text-[10px] uppercase tracking-widest mb-1">
                          Série Filtrada
                        </div>
                        <div className="font-mono text-lg font-bold text-slate-800" id="output-series-val">
                          {finalSeries || '--'}
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl" id="output-number-card">
                        <div className="text-slate-400 font-mono text-[10px] uppercase tracking-widest mb-1">
                          Número Filtrado
                        </div>
                        <div className="font-mono text-lg font-bold text-slate-800" id="output-number-val">
                          {finalNfNumber || '--'}
                        </div>
                      </div>
                    </div>

                    {/* Interactive breakdown visualizer */}
                    <div className="pt-2" id="breakdown-section">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-500" />
                        Composição da Chave (Passe o mouse)
                      </div>
                      
                      {/* Grid segments */}
                      <div className="flex flex-wrap gap-1" id="segments-grid">
                        {getKeySegments().map((seg, idx) => (
                          <div
                            key={idx}
                            className={`flex-1 min-w-[32px] text-center border p-1 rounded-md text-xs font-mono transition-all cursor-help relative group/seg ${seg.color}`}
                          >
                            <span className="block font-bold">{seg.val}</span>
                            <span className="block text-[8px] opacity-70 mt-0.5">{seg.label}</span>
                            
                            {/* Segment Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-lg pointer-events-none opacity-0 group-hover/seg:opacity-100 transition-opacity z-10 font-sans leading-normal">
                              <span className="block font-bold text-emerald-400 uppercase text-[9px] tracking-wider mb-0.5">{seg.desc}</span>
                              <span className="block text-slate-300 font-mono text-xs mt-1 bg-white/10 px-1 py-0.5 rounded text-center">Valor: {seg.val}</span>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium" id="no-key-state">
                    Insira os campos obrigatórios acima para visualizar a chave de acesso.
                  </div>
                )}
              </div>

              {/* History / Recent Keys Panel */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm" id="history-card">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Histórico de Geração Recente
                </h3>
                {history.length > 0 ? (
                  <div className="space-y-3" id="history-list">
                    {history.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 rounded-xl flex items-center justify-between gap-4 transition-all group"
                        id={`history-item-${idx}`}
                      >
                        <div className="min-w-0" id={`history-meta-${idx}`}>
                          <div className="font-mono text-[11px] font-semibold text-slate-700 truncate break-all select-all">
                            {formatKey(item.key)}
                          </div>
                          <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-1" id={`history-submeta-${idx}`}>
                            <span className="bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold uppercase">{item.uf}</span>
                            <span>NF: <strong className="text-slate-500 font-mono">{item.number}</strong></span>
                            <span>•</span>
                            <span>{item.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(item.key)}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm shrink-0"
                          title="Copiar chave deste histórico"
                          id={`btn-copy-history-${idx}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl" id="empty-history-state">
                    Os registros de chaves geradas manualmente serão exibidos aqui.
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          /* Validator Tab Content */
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm" id="validator-tab-content">
            <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2" id="validator-title">
              Validador de Chave de Acesso NF-e / NFC-e
            </h2>
            <p className="text-slate-500 text-xs mb-5" id="validator-desc">
              Cole uma chave de acesso com 44 dígitos para validar seu dígito verificador e extrair todas as informações de emissão estruturadas.
            </p>

            <div className="space-y-5" id="validator-inputs">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="input-validator-key">
                  Chave de Acesso (44 dígitos)
                </label>
                <div className="relative" id="validator-input-wrapper">
                  <input
                    type="text"
                    id="input-validator-key"
                    placeholder="3526 0712 3456 7800 0190 5500 1000 1234 5611 2345 6789"
                    value={inputKey}
                    onChange={(e) => handleValidate(e.target.value)}
                    maxLength={55}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-3 text-sm font-mono tracking-wider focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800"
                  />
                  {inputKey && (
                    <button
                      onClick={() => handleValidate('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold"
                      id="btn-clear-validator"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {validationResult && (
                <div className="space-y-4 pt-2" id="validation-result-panel">
                  {/* Status Box */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      validationResult.isValid
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                    id="validation-status-box"
                  >
                    {validationResult.isValid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">
                        {validationResult.isValid ? 'Chave Válida!' : 'Chave Inválida!'}
                      </h4>
                      <p className="text-xs opacity-90 mt-0.5">
                        {validationResult.isValid
                          ? 'O dígito verificador confere com o cálculo do algoritmo Módulo 11.'
                          : validationResult.error}
                      </p>
                    </div>
                  </div>

                  {/* Parsed Meta Information Grid */}
                  {validationResult.parsed && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5" id="parsed-results-grid">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-500" />
                        Metadados Extraídos da Chave
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs" id="metadata-grid">
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Estado (UF)</span>
                            <span className="font-semibold text-slate-800">{validationResult.parsed.ufName} ({validationResult.parsed.uf})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Período de Emissão</span>
                            <span className="font-semibold text-slate-800">{validationResult.parsed.date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg md:col-span-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">CNPJ do Emitente</span>
                            <span className="font-mono font-semibold text-slate-800">{validationResult.parsed.cnpj}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Modelo</span>
                            <span className="font-semibold text-slate-800">
                              {validationResult.parsed.model === '55' ? '55 (NF-e)' : validationResult.parsed.model === '65' ? '65 (NFC-e)' : validationResult.parsed.model}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <Layers className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Série</span>
                            <span className="font-mono font-semibold text-slate-800">{validationResult.parsed.series}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <Hash className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Número Fiscal</span>
                            <span className="font-mono font-semibold text-slate-800">{validationResult.parsed.number}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-2.5 bg-white border border-slate-200/50 rounded-lg">
                          <Sliders className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-slate-400 font-semibold text-[10px] uppercase">Dígito Verificador (DV)</span>
                            <span className="font-mono font-bold text-slate-800">{validationResult.parsed.dv}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
