'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Search,
  Upload,
  Download,
  Play,
  Pause,
  Trash2,
  Plus,
  Link,
  Volume2,
  Globe,
  User,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  X,
  Loader2,
  Sparkles,
  Music,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { voicelabAPI } from '@/lib/api';
import { ElevenLabsVoice } from '@/types';

// ============================================================================
// Language code to display name mapping
// ============================================================================

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', pl: 'Polish', ja: 'Japanese', ko: 'Korean',
  zh: 'Chinese', ar: 'Arabic', ta: 'Tamil', te: 'Telugu', bn: 'Bengali',
  mr: 'Marathi', ru: 'Russian', nl: 'Dutch', sv: 'Swedish', tr: 'Turkish',
  id: 'Indonesian', ms: 'Malay', th: 'Thai', vi: 'Vietnamese', uk: 'Ukrainian',
  cs: 'Czech', ro: 'Romanian', da: 'Danish', fi: 'Finnish', el: 'Greek',
  hu: 'Hungarian', no: 'Norwegian', sk: 'Slovak', bg: 'Bulgarian', hr: 'Croatian',
};

function getLangName(code: string): string {
  if (!code) return '';
  return LANG_NAMES[code.toLowerCase()] || code.toUpperCase();
}

// ============================================================================
// Helper Components
// ============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Copy Voice ID"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400" />
      )}
    </button>
  );
}

function AudioPreview({ url, voiceName }: { url: string; voiceName: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
      <button
        onClick={toggle}
        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={`Preview ${voiceName}`}
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 text-orange-500" />
        ) : (
          <Play className="w-3.5 h-3.5 text-orange-500" />
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Voice Card Component
// ============================================================================

function VoiceCard({
  voice,
  onDelete,
  onSelect,
  isSelected,
}: {
  voice: ElevenLabsVoice;
  onDelete?: (id: string) => void;
  onSelect?: (voice: ElevenLabsVoice) => void;
  isSelected?: boolean;
}) {
  const genderColor =
    voice.gender?.toLowerCase() === 'male'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : voice.gender?.toLowerCase() === 'female'
      ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  const categoryIcon =
    voice.category === 'cloned' ? (
      <Sparkles className="w-3 h-3" />
    ) : voice.category === 'professional' ? (
      <Music className="w-3 h-3" />
    ) : null;

  return (
    <div
      onClick={() => onSelect?.(voice)}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20 ring-1 ring-orange-500'
          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-md'
      }`}
    >
      {/* Top Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
            <Volume2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {voice.name}
            </h4>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="truncate">{voice.voice_id.slice(0, 12)}...</span>
              <CopyButton text={voice.voice_id} />
            </div>
          </div>
        </div>
        {voice.preview_url && (
          <AudioPreview url={voice.preview_url} voiceName={voice.name} />
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {voice.gender && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${genderColor}`}>
            {voice.gender}
          </span>
        )}
        {voice.accent && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            {voice.accent}
          </span>
        )}
        {voice.language && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Globe className="w-2.5 h-2.5" />
            {getLangName(voice.language)}
          </span>
        )}
        {voice.age && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {voice.age}
          </span>
        )}
        {voice.category && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {categoryIcon}
            {voice.category}
          </span>
        )}
      </div>

      {/* Description */}
      {voice.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {voice.description}
        </p>
      )}

      {/* Use Case + Actions */}
      <div className="flex items-center justify-between">
        {voice.use_case && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {voice.use_case}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[10px] font-medium text-orange-500">
            {voice.provider}
          </span>
          {voice.is_cloned && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(voice.voice_id);
              }}
              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete voice"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Clone Voice Section
// ============================================================================

function CloneVoiceSection({ onCloned }: { onCloned: () => void }) {
  const [provider, setProvider] = useState('elevenlabs');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClone = async () => {
    if (!name.trim()) {
      setError('Voice name is required');
      return;
    }
    if (!file) {
      setError('Audio sample file is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('language', language);
      formData.append('file', file);

      const response = await voicelabAPI.cloneVoice(formData);
      setSuccess(`Voice "${name}" cloned successfully! ID: ${response.data.voice_id}`);
      setName('');
      setDescription('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onCloned();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to clone voice');
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'pl', label: 'Polish' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ar', label: 'Arabic' },
    { value: 'ta', label: 'Tamil' },
    { value: 'te', label: 'Telugu' },
    { value: 'bn', label: 'Bengali' },
    { value: 'mr', label: 'Marathi' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle>Clone Voices</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Clone your own voices by uploading audio samples
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider */}
          <Select
            label="Choose Voice Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            options={[
              { value: 'elevenlabs', label: 'ElevenLabs' },
            ]}
          />

          {/* Name */}
          <Input
            label="New Voice Name"
            placeholder="Enter voice name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Describe the voice characteristics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-none"
            />
          </div>

          {/* File Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Import Voice Sample
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file
                  ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <Music className="w-8 h-8 text-orange-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload audio sample
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    MP3, WAV, M4A, OGG, FLAC (max 10MB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Language */}
          <Select
            label="Sample Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={languageOptions}
          />

          {/* Clone Button */}
          <div className="flex items-end">
            <Button
              onClick={handleClone}
              disabled={loading || !name.trim() || !file}
              loading={loading}
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              Clone Voice
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Import Voice Section
// ============================================================================

function ImportVoiceSection({ onImported }: { onImported: () => void }) {
  const [provider, setProvider] = useState('elevenlabs');
  const [voiceId, setVoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    if (!voiceId.trim()) {
      setError('Voice ID is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await voicelabAPI.importVoice(voiceId.trim(), provider);
      setSuccess(`Voice "${response.data.name}" imported successfully!`);
      setVoiceId('');
      onImported();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to import voice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Download className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle>Import Voices</CardTitle>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Import additional voices or your own custom voices
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider */}
          <Select
            label="Choose Voice Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            options={[
              { value: 'elevenlabs', label: 'ElevenLabs' },
            ]}
          />

          {/* Voice ID */}
          <Input
            label="Import Voice ID"
            placeholder="Enter Voice ID"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
          />

          {/* Connected Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Import from connected ElevenLabs account
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Connected</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Link className="w-3.5 h-3.5 mr-1.5" />
                Connect
              </Button>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex items-end">
            <Button
              onClick={handleImport}
              disabled={loading || !voiceId.trim()}
              loading={loading}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Import Voice
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Voice Lab Page
// ============================================================================

export default function VoiceLabPage() {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Subscription info
  const [subscription, setSubscription] = useState<any>(null);

  const fetchVoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await voicelabAPI.listVoices();
      setVoices(response.data.voices || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load voices');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await voicelabAPI.subscription();
      setSubscription(response.data);
    } catch {
      // Subscription info is optional
    }
  }, []);

  useEffect(() => {
    fetchVoices();
    fetchSubscription();
  }, [fetchVoices, fetchSubscription]);

  // Filter voices
  useEffect(() => {
    let filtered = [...voices];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.accent?.toLowerCase().includes(q) ||
          v.language?.toLowerCase().includes(q) ||
          v.gender?.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q) ||
          v.use_case?.toLowerCase().includes(q)
      );
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(
        (v) => v.language?.toLowerCase() === languageFilter.toLowerCase()
      );
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter(
        (v) => v.gender?.toLowerCase() === genderFilter.toLowerCase()
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(
        (v) => v.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    setFilteredVoices(filtered);
  }, [voices, searchQuery, languageFilter, genderFilter, categoryFilter]);

  // Get unique filter values
  const languages = [...new Set(voices.map((v) => v.language).filter(Boolean))].sort();
  const genders = [...new Set(voices.map((v) => v.gender).filter(Boolean))].sort();
  const categories = [...new Set(voices.map((v) => v.category).filter(Boolean))].sort();

  const handleDelete = async (voiceId: string) => {
    setDeleting(true);
    try {
      await voicelabAPI.deleteVoice(voiceId);
      setDeleteConfirm(null);
      fetchVoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete voice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Lab</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Test and fine-tune voice models
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Subscription Info */}
          {subscription && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Characters Used</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {subscription.character_count?.toLocaleString()} / {subscription.character_limit?.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan</p>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 capitalize">
                  {subscription.tier || 'Free'}
                </p>
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => { fetchVoices(); fetchSubscription(); }}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search voice, accent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Language Filter */}
            <div className="w-full md:w-40">
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm"
              >
                <option value="all">All Languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {getLangName(lang)}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="w-full md:w-36">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm"
              >
                <option value="all">All Genders</option>
                {genders.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-40">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Language Buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { value: 'all', label: 'All' },
              { value: 'hi', label: 'Hindi' },
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Spanish' },
              { value: 'fr', label: 'French' },
              { value: 'de', label: 'German' },
              { value: 'ta', label: 'Tamil' },
              { value: 'te', label: 'Telugu' },
            ].map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setLanguageFilter(lang.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    languageFilter === lang.value
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {lang.label}
                </button>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provider Badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <div className="w-5 h-5 rounded bg-black flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">XI</span>
          </div>
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
            ElevenLabs
          </span>
          <span className="text-xs text-orange-500 dark:text-orange-500">
            {voices.length} voices
          </span>
        </div>
        {filteredVoices.length !== voices.length && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredVoices.length} of {voices.length}
          </span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
            <p className="text-xs text-red-500 mt-1">
              Make sure ELEVENLABS_API_KEY is configured in the backend .env file.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchVoices} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading voices from ElevenLabs...</p>
          </div>
        </div>
      )}

      {/* Voices Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVoices.map((voice) => (
            <VoiceCard
              key={voice.voice_id}
              voice={voice}
              isSelected={selectedVoice?.voice_id === voice.voice_id}
              onSelect={setSelectedVoice}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredVoices.length === 0 && voices.length > 0 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No voices match your filters</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Try adjusting your search or filters
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setSearchQuery('');
              setLanguageFilter('all');
              setGenderFilter('all');
              setCategoryFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Clone & Import Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CloneVoiceSection onCloned={fetchVoices} />
        <ImportVoiceSection onImported={fetchVoices} />
      </div>

      {/* Selected Voice Detail Panel */}
      {selectedVoice && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                  <Volume2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>{selectedVoice.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {selectedVoice.voice_id}
                    </code>
                    <CopyButton text={selectedVoice.voice_id} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedVoice.preview_url && (
                  <AudioPreview url={selectedVoice.preview_url} voiceName={selectedVoice.name} />
                )}
                <button
                  onClick={() => setSelectedVoice(null)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {selectedVoice.gender && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoice.gender}</p>
                </div>
              )}
              {selectedVoice.accent && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Accent</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoice.accent}</p>
                </div>
              )}
              {selectedVoice.language && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Language</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{getLangName(selectedVoice.language)}</p>
                </div>
              )}
              {selectedVoice.age && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Age</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoice.age}</p>
                </div>
              )}
              {selectedVoice.category && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{selectedVoice.category}</p>
                </div>
              )}
              {selectedVoice.use_case && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Use Case</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedVoice.use_case}</p>
                </div>
              )}
              {selectedVoice.provider && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Provider</p>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{selectedVoice.provider}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedVoice.is_cloned ? 'Cloned' : selectedVoice.is_professional ? 'Professional' : 'Pre-made'}
                </p>
              </div>
            </div>
            {selectedVoice.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedVoice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Voice"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this voice? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Voice
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Powered by{' '}
          <span className="font-medium text-gray-600 dark:text-gray-400">ElevenLabs</span>
          {' '}&middot;{' '}
          Voices are managed through the ElevenLabs API
        </p>
      </div>
    </div>
  );
}
