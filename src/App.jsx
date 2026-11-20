import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import {
  Camera,
  Image as ImageIcon,
  Heart,
  Shield,
  X,
  Download,
  Monitor,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Video,
  MessageCircleHeart,
} from 'lucide-react';

// ==========================================
// FIREBASE & CLOUDINARY CONFIG
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCRFDe2pJPcXxbBgryoMMxpy9Y8KUtkYKk",
  authDomain: "wedding-album-4df7f.firebaseapp.com",
  projectId: "wedding-album-4df7f",
  storageBucket: "wedding-album-4df7f.firebasestorage.app",
  messagingSenderId: "314113618467",
  appId: "1:314113618467:web:a101456b8a2dfbae333796",
};

const CLOUDINARY_CLOUD_NAME = "ao6tuyep";
const CLOUDINARY_UPLOAD_PRESET = "wedding_upload";
const ADMIN_PIN = "2026";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const DEFAULT_CHALLENGES = [
  {
    id: 'c1',
    title: 'Cả bàn nâng ly',
    description: 'Một tấm đông đủ cả bàn mình tối nay.',
    tier: 'Tại bàn',
    order: 1,
    isActive: true,
  },
  {
    id: 'c2',
    title: 'Selfie cùng người ngồi cạnh',
    description: 'Chụp nhanh một kiểu kỷ niệm với người bên cạnh.',
    tier: 'Tại bàn',
    order: 2,
    isActive: true,
  },
  {
    id: 'c3',
    title: 'Món ngon hoặc góc bàn đẹp',
    description: 'Hoa bàn tiệc, ly rượu hay món mọi người thích nhất.',
    tier: 'Tại bàn',
    order: 3,
    isActive: true,
  },
  {
    id: 'c4',
    title: 'Khoảnh khắc tự nhiên nhất',
    description: 'Một nụ cười, cái ôm hay góc nào đó thật vui trong sảnh.',
    tier: 'Dạo quanh',
    order: 4,
    isActive: true,
  },
  {
    id: 'c5',
    title: 'Góc nhìn từ bàn mình lên sân khấu',
    description: 'Khoảnh khắc chúng mình bước lên sân khấu hoặc cụng ly.',
    tier: 'Dạo quanh',
    order: 5,
    isActive: true,
  },
  {
    id: 'c6',
    title: 'Chụp chung với cô dâu chú rể',
    description: 'Khi chúng mình đi chào bàn, nhớ gọi lại làm một kiểu nhé.',
    tier: 'Đặc biệt',
    order: 6,
    isActive: true,
  },
];

// ==========================================
// CUSTOM BURGUNDY INTERTWINED TT MONOGRAM
// ==========================================
function MonogramTT({ className = "w-12 h-12", color = "#6E1B1E", cutout = "#F5F0E8" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Monogram TT">
      {/* Classic serif T */}
      <path
        d="M34 32 H86 V42 C84 36 80 35 72 35 H64 V88 C64 93 66 95 72 96 V98 H48 V96 C54 95 56 93 56 88 V35 H48 C40 35 36 36 34 42 V32 Z"
        fill={color}
      />
      {/* Negative space cutout for sweeping script top loop */}
      <path
        d="M72 28 C67 38 61 52 55 68"
        stroke={cutout}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* Sweeping calligraphic script T */}
      <path
        d="M28 45 C14 42 12 22 32 17 C54 12 76 28 96 27 C108 26 110 15 98 15 C84 15 73 30 63 54 C54 75 46 95 36 101 C30 104 25 101 27 97"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Negative space cutout for mid crossbar */}
      <path
        d="M42 68 C52 62 65 59 75 53"
        stroke={cutout}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Calligraphic mid flourish */}
      <path
        d="M38 83 C34 72 44 63 59 59 C69 56 76 52 78 46"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ==========================================
// HELPERS: GUEST ID & CANVAS COMPRESSION
// ==========================================
function getOrCreateGuestId() {
  try {
    let id = localStorage.getItem('wedding_guest_id');
    if (!id) {
      id = 'g_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('wedding_guest_id', id);
      document.cookie = `wedding_guest_id=${id}; max-age=${60 * 60 * 24 * 30}; path=/`;
    }
    return id;
  } catch {
    return 'g_' + Math.random().toString(36).slice(2, 10);
  }
}

function getSavedGuestName() {
  try {
    return localStorage.getItem('wedding_guest_name') || '';
  } catch {
    return '';
  }
}

function optimizeCloudinaryUrl(url, width = 900) {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  if (url.includes('/video/upload/')) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`);
}

async function compressImageFile(file, maxDim = 2000, quality = 0.86) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 2.2 * 1024 * 1024) {
        resolve(file);
        return;
      }
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

async function uploadToCloudinary(file) {
  const isVideo = file.type.startsWith('video/');
  const processedFile = isVideo ? file : await compressImageFile(file);
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo ? 'video' : 'image'}/upload`;
  const formData = new FormData();
  formData.append('file', processedFile);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'wedding-album');

  const res = await fetch(endpoint, { method: 'POST', body: formData });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudinary error: ${errText}`);
  }
  const data = await res.json();
  return {
    mediaUrl: data.secure_url,
    mediaType: isVideo ? 'video' : 'photo',
    publicId: data.public_id,
  };
}

// ==========================================
// MAIN APP
// ==========================================
export default function App() {
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialMode = urlParams.get('mode'); // 'led' | 'admin' | null

  const [guestId] = useState(() => getOrCreateGuestId());
  const [guestName, setGuestName] = useState(() => getSavedGuestName());

  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'gallery'
  const [galleryFilter, setGalleryFilter] = useState('all'); // 'all' | 'mine' | 'video'

  const [uploads, setUploads] = useState([]);
  const [challenges, setChallenges] = useState(DEFAULT_CHALLENGES);
  const [albumGoal, setAlbumGoal] = useState(100);
  const [isConnected, setIsConnected] = useState(false);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState({ active: false, current: 0, total: 0, error: '' });
  const [pendingChallengeId, setPendingChallengeId] = useState(null);
  const [noteModal, setNoteModal] = useState({ open: false, uploadIds: [], name: '', note: '' });

  // Lightbox
  const [lightboxItem, setLightboxItem] = useState(null);
  const [likedIds, setLikedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wedding_liked_ids') || '[]');
    } catch {
      return [];
    }
  });

  // LED Mode
  const [ledOpen, setLedOpen] = useState(initialMode === 'led');
  const [ledIndex, setLedIndex] = useState(0);
  const [ledPlaying, setLedPlaying] = useState(true);

  // Admin Portal
  const [adminOpen, setAdminOpen] = useState(initialMode === 'admin');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [adminTab, setAdminTab] = useState('photos'); // 'photos' | 'prompts' | 'settings'
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [newPromptTier, setNewPromptTier] = useState('Tại bàn');
  const [goalDraft, setGoalDraft] = useState('100');

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // ==========================================
  // FIRESTORE REAL-TIME SUBSCRIPTIONS
  // ==========================================
  useEffect(() => {
    // 1. Uploads
    const qUploads = query(collection(db, 'uploads'), orderBy('createdAt', 'desc'));
    const unsubUploads = onSnapshot(
      qUploads,
      (snap) => {
        setIsConnected(true);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUploads(list);
      },
      (err) => {
        console.error('Firestore uploads error:', err);
      }
    );

    // 2. Challenges (auto-seed if empty)
    const qChallenges = query(collection(db, 'challenges'), orderBy('order', 'asc'));
    const unsubChallenges = onSnapshot(qChallenges, async (snap) => {
      if (snap.empty) {
        try {
          for (const ch of DEFAULT_CHALLENGES) {
            await setDoc(doc(db, 'challenges', ch.id), ch);
          }
        } catch (e) {
          console.error('Seed challenges failed:', e);
        }
      } else {
        setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    });

    // 3. Settings (shared goal)
    const settingsRef = doc(db, 'settings', 'wedding');
    const unsubSettings = onSnapshot(settingsRef, async (snap) => {
      if (snap.exists() && snap.data().albumGoal) {
        setAlbumGoal(snap.data().albumGoal);
        setGoalDraft(String(snap.data().albumGoal));
      } else {
        try {
          const check = await getDoc(settingsRef);
          if (!check.exists()) {
            await setDoc(settingsRef, { albumGoal: 100 });
          }
        } catch (e) {
          console.error('Seed settings failed:', e);
        }
      }
    });

    return () => {
      unsubUploads();
      unsubChallenges();
      unsubSettings();
    };
  }, []);

  // Visible uploads for guests & LED
  const visibleUploads = useMemo(
    () => uploads.filter((u) => !u.isHidden),
    [uploads]
  );

  const filteredGallery = useMemo(() => {
    if (galleryFilter === 'mine') return visibleUploads.filter((u) => u.guestId === guestId);
    if (galleryFilter === 'video') return visibleUploads.filter((u) => u.mediaType === 'video');
    return visibleUploads;
  }, [visibleUploads, galleryFilter, guestId]);

  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.isActive),
    [challenges]
  );

  const progressPct = Math.min(100, Math.round((visibleUploads.length / Math.max(1, albumGoal)) * 100));

  // LED Slideshow timer
  useEffect(() => {
    if (!ledOpen || !ledPlaying || visibleUploads.length <= 1) return;
    const timer = setInterval(() => {
      setLedIndex((prev) => (prev + 1) % visibleUploads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [ledOpen, ledPlaying, visibleUploads.length]);

  useEffect(() => {
    if (ledIndex >= visibleUploads.length) setLedIndex(0);
  }, [visibleUploads.length, ledIndex]);

  // ==========================================
  // UPLOAD HANDLER (SEQUENTIAL 1-BY-1)
  // ==========================================
  const handleFilesSelected = async (fileList, challengeId = null) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadQueue({ active: true, current: 0, total: files.length, error: '' });
    const createdIds = [];

    for (let i = 0; i < files.length; i++) {
      setUploadQueue({ active: true, current: i + 1, total: files.length, error: '' });
      try {
        const uploaded = await uploadToCloudinary(files[i]);
        const docRef = await addDoc(collection(db, 'uploads'), {
          mediaUrl: uploaded.mediaUrl,
          mediaType: uploaded.mediaType,
          publicId: uploaded.publicId || '',
          guestId,
          guestName: guestName.trim() || 'Khách mời',
          note: '',
          challengeId: challengeId || null,
          likes: 0,
          isHidden: false,
          createdAt: serverTimestamp(),
        });
        createdIds.push(docRef.id);
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadQueue((prev) => ({
          ...prev,
          error: 'Có ảnh chưa gửi được do mạng yếu, mọi người thử lại nhé.',
        }));
      }
    }

    setPendingChallengeId(null);
    setUploadQueue({ active: false, current: 0, total: 0, error: '' });

    if (createdIds.length > 0) {
      setNoteModal({
        open: true,
        uploadIds: createdIds,
        name: guestName,
        note: '',
      });
    }
  };

  const handleSaveNoteAndName = async () => {
    const cleanName = noteModal.name.trim();
    const cleanNote = noteModal.note.trim();

    if (cleanName) {
      setGuestName(cleanName);
      try {
        localStorage.setItem('wedding_guest_name', cleanName);
      } catch {}
    }

    if (cleanName || cleanNote) {
      for (const id of noteModal.uploadIds) {
        try {
          await updateDoc(doc(db, 'uploads', id), {
            ...(cleanName ? { guestName: cleanName } : {}),
            ...(cleanNote ? { note: cleanNote } : {}),
          });
        } catch (e) {
          console.error('Update note error:', e);
        }
      }
    }

    setNoteModal({ open: false, uploadIds: [], name: '', note: '' });
    setActiveTab('gallery');
  };

  const handleLike = async (item) => {
    const alreadyLiked = likedIds.includes(item.id);
    const nextLiked = alreadyLiked
      ? likedIds.filter((id) => id !== item.id)
      : [...likedIds, item.id];

    setLikedIds(nextLiked);
    try {
      localStorage.setItem('wedding_liked_ids', JSON.stringify(nextLiked));
      await updateDoc(doc(db, 'uploads', item.id), {
        likes: increment(alreadyLiked ? -1 : 1),
      });
    } catch (e) {
      console.error('Like error:', e);
    }
  };

  const handleDownloadOriginal = async (item) => {
    try {
      const response = await fetch(item.mediaUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ngay-chung-vui-${item.id.slice(0, 6)}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(item.mediaUrl, '_blank');
    }
  };

  // ==========================================
  // ADMIN ACTIONS
  // ==========================================
  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setAdminUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleToggleHide = async (item) => {
    await updateDoc(doc(db, 'uploads', item.id), { isHidden: !item.isHidden });
  };

  const handleDeleteUpload = async (item) => {
    if (!window.confirm('Xóa ảnh này khỏi album?')) return;
    await deleteDoc(doc(db, 'uploads', item.id));
  };

  const handleToggleChallenge = async (ch) => {
    await updateDoc(doc(db, 'challenges', ch.id), { isActive: !ch.isActive });
  };

  const handleAddChallenge = async (e) => {
    e.preventDefault();
    if (!newPromptTitle.trim()) return;
    const id = 'c_' + Date.now();
    await setDoc(doc(db, 'challenges', id), {
      id,
      title: newPromptTitle.trim(),
      description: newPromptDesc.trim() || 'Ghi lại khoảnh khắc đáng nhớ tối nay.',
      tier: newPromptTier,
      order: challenges.length + 1,
      isActive: true,
    });
    setNewPromptTitle('');
    setNewPromptDesc('');
  };

  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    const num = Math.max(10, parseInt(goalDraft, 10) || 100);
    await setDoc(doc(db, 'settings', 'wedding'), { albumGoal: num }, { merge: true });
    setAlbumGoal(num);
  };

  // ==========================================
  // LED SLIDESHOW VIEW
  // ==========================================
  if (ledOpen) {
    const current = visibleUploads[ledIndex];
    return (
      <div className="fixed inset-0 z-50 bg-[#181211] text-[#F5F0E8] flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <MonogramTT className="w-10 h-10" color="#E6C9C9" cutout="#181211" />
            <div>
              <p className="font-serif-display text-lg tracking-wide">Ngày chung vui</p>
              <p className="text-xs text-[#F5F0E8]/60">
                Cuốn phim tối nay · {visibleUploads.length} / {albumGoal} khoảnh khắc
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLedPlaying((p) => !p)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1.5"
            >
              {ledPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {ledPlaying ? 'Tạm dừng' : 'Tiếp tục'}
            </button>
            <button
              onClick={() => setLedOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Đóng màn hình LED"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main stage */}
        <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
          {!current ? (
            <div className="text-center max-w-md">
              <MonogramTT className="w-20 h-20 mx-auto mb-4" color="#E6C9C9" cutout="#181211" />
              <p className="font-serif-display text-2xl mb-2">Đang chờ những khoảnh khắc đầu tiên</p>
              <p className="text-sm text-[#F5F0E8]/60">
                Mọi người quét mã QR tại bàn để gửi ảnh lên màn hình lớn nhé.
              </p>
            </div>
          ) : (
            <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center gap-5">
              <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                {current.mediaType === 'video' ? (
                  <video
                    key={current.id}
                    src={current.mediaUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain"
                  />
                ) : (
                  <img
                    key={current.id}
                    src={optimizeCloudinaryUrl(current.mediaUrl, 1600)}
                    alt="Khoảnh khắc"
                    className="max-h-full max-w-full rounded-2xl shadow-2xl object-contain"
                  />
                )}
              </div>

              <div className="text-center max-w-2xl px-4">
                {current.note && (
                  <p className="font-serif-display italic text-xl md:text-2xl text-[#F5F0E8] mb-1.5">
                    “{current.note}”
                  </p>
                )}
                <p className="text-sm text-[#E6C9C9]/80">
                  {current.guestName || 'Khách mời'}
                </p>
              </div>
            </div>
          )}

          {visibleUploads.length > 1 && (
            <>
              <button
                onClick={() => setLedIndex((i) => (i - 1 + visibleUploads.length) % visibleUploads.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLedIndex((i) => (i + 1) % visibleUploads.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN GUEST VIEW
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#2A1F1D] pb-24">
      {/* Hidden native inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files, pendingChallengeId);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files, pendingChallengeId);
          e.target.value = '';
        }}
      />

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#F5F0E8]/92 backdrop-blur-md border-b border-[#E4DBD0]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MonogramTT className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif-display font-semibold text-base tracking-tight text-[#2A1F1D]">
                  Ngày chung vui
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`}
                  title={isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
                />
              </div>
              <p className="text-[11px] text-[#7A6B66] leading-none">Album chung tối nay</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLedOpen(true)}
              className="px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#FDFBF7] border border-[#E4DBD0] text-[#6E1B1E] hover:bg-[#F6EAEB] flex items-center gap-1.5 transition"
              title="Mở chế độ màn hình LED"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>LED</span>
            </button>
            <button
              onClick={() => setAdminOpen(true)}
              className="p-2 rounded-full text-[#7A6B66] hover:text-[#6E1B1E] hover:bg-[#FDFBF7] transition"
              title="Quản trị"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Upload Progress Banner */}
      {uploadQueue.active && (
        <div className="sticky top-14 z-20 bg-[#6E1B1E] text-[#FDFBF7] px-4 py-2.5 shadow-sm">
          <div className="max-w-lg mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                Đang lưu ảnh {uploadQueue.current}/{uploadQueue.total} vào album chung...
              </span>
            </div>
            <span className="opacity-80">Giữ màn hình mở nhé</span>
          </div>
        </div>
      )}

      {uploadQueue.error && (
        <div className="max-w-lg mx-auto px-4 pt-3">
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <span>{uploadQueue.error}</span>
            <button onClick={() => setUploadQueue((p) => ({ ...p, error: '' }))}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {activeTab === 'home' ? (
          <>
            {/* Editorial Hero Card */}
            <section className="bg-[#FDFBF7] border border-[#E4DBD0] rounded-3xl p-6 text-center shadow-[0_6px_24px_rgba(42,31,29,0.04)]">
              <MonogramTT className="w-16 h-16 mx-auto mb-2" cutout="#FDFBF7" />
              <h1 className="font-serif-display text-2xl font-semibold text-[#2A1F1D] mb-2">
                Cùng lưu lại tối nay
              </h1>
              <p className="text-sm text-[#6E5F5A] leading-relaxed mb-5 max-w-sm mx-auto">
                Ảnh mọi người gửi sẽ hiện lên album chung và màn hình lớn trong tiệc, để tất cả cùng xem vui và tải ảnh đẹp về máy.
              </p>

              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setPendingChallengeId(null);
                    cameraInputRef.current?.click();
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-[#6E1B1E] hover:bg-[#5A1518] active:scale-[0.99] text-[#FDFBF7] font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Chụp ngay</span>
                </button>
                <button
                  onClick={() => {
                    setPendingChallengeId(null);
                    galleryInputRef.current?.click();
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-[#F6EAEB] hover:bg-[#EEDADB] active:scale-[0.99] text-[#6E1B1E] font-medium text-sm flex items-center justify-center gap-2 border border-[#E5C9CB] transition"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>Chọn từ máy</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8E7F7A] mt-3">
                Chọn nhiều ảnh cùng lúc đều được · Không cần đăng nhập
              </p>
            </section>

            {/* Shared Film Roll Progress */}
            <section className="bg-[#FDFBF7] border border-[#E4DBD0] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#6E1B1E]" />
                  <span className="text-sm font-semibold text-[#2A1F1D]">Cuốn phim tối nay</span>
                </div>
                <span className="text-xs font-semibold text-[#6E1B1E]">
                  {visibleUploads.length} / {albumGoal} khoảnh khắc
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#EFE7DC] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#6E1B1E] transition-all duration-500"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>
              <p className="text-xs text-[#7A6B66] mt-2">
                Mỗi tấm ảnh từ các bàn sẽ góp thêm một mảnh ghép vào cuốn phim chung của buổi tiệc.
              </p>
            </section>

            {/* Photo Ideas */}
            <section>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="font-serif-display text-lg font-semibold text-[#2A1F1D]">
                  Chụp gì tối nay?
                </h2>
                <span className="text-xs text-[#8E7F7A]">Gợi ý vui · không bắt buộc</span>
              </div>

              <div className="space-y-2.5">
                {activeChallenges.map((ch) => {
                  const countForCh = visibleUploads.filter((u) => u.challengeId === ch.id).length;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        setPendingChallengeId(ch.id);
                        galleryInputRef.current?.click();
                      }}
                      className="group bg-[#FDFBF7] border border-[#E4DBD0] hover:border-[#C9A7A9] rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F6EAEB] text-[#6E1B1E]">
                            {ch.tier || 'Gợi ý'}
                          </span>
                          {countForCh > 0 && (
                            <span className="text-[11px] text-[#7A6B66]">
                              {countForCh} ảnh đã gửi
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-[#2A1F1D] truncate">{ch.title}</h3>
                        <p className="text-xs text-[#7A6B66] mt-0.5 line-clamp-2">{ch.description}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#F5F0E8] group-hover:bg-[#6E1B1E] group-hover:text-[#FDFBF7] text-[#6E1B1E] flex items-center justify-center shrink-0 transition">
                        <Camera className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* GALLERY TAB */
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif-display text-xl font-semibold text-[#2A1F1D]">
                Album chung
              </h2>
              <span className="text-xs text-[#7A6B66]">{filteredGallery.length} khoảnh khắc</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'mine', label: 'Ảnh mình gửi' },
                { key: 'video', label: 'Video' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setGalleryFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    galleryFilter === f.key
                      ? 'bg-[#6E1B1E] text-[#FDFBF7]'
                      : 'bg-[#FDFBF7] text-[#6E5F5A] border border-[#E4DBD0]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredGallery.length === 0 ? (
              <div className="bg-[#FDFBF7] border border-[#E4DBD0] rounded-3xl p-10 text-center">
                <ImageIcon className="w-8 h-8 text-[#C9B9B2] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#2A1F1D] mb-1">Chưa có ảnh nào ở đây</p>
                <p className="text-xs text-[#7A6B66] mb-4">
                  Gửi tấm đầu tiên để mở màn cuốn phim tối nay nhé.
                </p>
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[#6E1B1E] text-[#FDFBF7] text-xs font-medium"
                >
                  Gửi ảnh ngay
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredGallery.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLightboxItem(item)}
                    className="group relative bg-[#FDFBF7] border border-[#E4DBD0] rounded-2xl overflow-hidden cursor-pointer shadow-sm"
                  >
                    <div className="aspect-[4/5] bg-[#EAE2D7] relative overflow-hidden">
                      {item.mediaType === 'video' ? (
                        <>
                          <video
                            src={item.mediaUrl}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-black/55 text-white p-1.5 rounded-full">
                            <Video className="w-3 h-3" />
                          </div>
                        </>
                      ) : (
                        <img
                          src={optimizeCloudinaryUrl(item.mediaUrl, 600)}
                          alt={item.note || 'Ảnh tiệc'}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                        />
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-[#2A1F1D] truncate">
                          {item.guestName || 'Khách mời'}
                        </span>
                        <span className="text-[11px] text-[#8E7F7A] flex items-center gap-0.5 shrink-0">
                          <Heart
                            className={`w-3 h-3 ${
                              likedIds.includes(item.id) ? 'fill-[#6E1B1E] text-[#6E1B1E]' : ''
                            }`}
                          />
                          {item.likes || 0}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-[11px] text-[#7A6B66] truncate mt-0.5 italic">
                          “{item.note}”
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Floating Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-md border-t border-[#E4DBD0]">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${
              activeTab === 'home' ? 'text-[#6E1B1E]' : 'text-[#8E7F7A]'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>Trang chính</span>
          </button>

          <button
            onClick={() => {
              setPendingChallengeId(null);
              galleryInputRef.current?.click();
            }}
            className="-mt-6 w-14 h-14 rounded-full bg-[#6E1B1E] hover:bg-[#5A1518] text-[#FDFBF7] shadow-lg flex items-center justify-center border-4 border-[#F5F0E8] active:scale-95 transition"
            aria-label="Gửi ảnh"
          >
            <Plus className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${
              activeTab === 'gallery' ? 'text-[#6E1B1E]' : 'text-[#8E7F7A]'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span>Album ({visibleUploads.length})</span>
          </button>
        </div>
      </nav>

      {/* Post-Upload Optional Name & Wish Modal */}
      {noteModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FDFBF7] border border-[#E4DBD0] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-[#6E1B1E] mb-2">
              <div className="w-8 h-8 rounded-full bg-[#F6EAEB] flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <h3 className="font-serif-display text-lg font-semibold text-[#2A1F1D]">
                Đã lưu vào album chung!
              </h3>
            </div>
            <p className="text-xs text-[#7A6B66] mb-4">
              Có thể để lại tên hoặc vài chữ nhắn gửi để hiện đẹp hơn khi chiếu lên màn hình (không bắt buộc).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#5A4D48] mb-1">
                  Tên của mọi người
                </label>
                <input
                  type="text"
                  value={noteModal.name}
                  onChange={(e) => setNoteModal((p) => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Minh, Bàn 5..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F0E8] border border-[#E4DBD0] text-sm focus:outline-none focus:border-[#6E1B1E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5A4D48] mb-1 flex items-center gap-1">
                  <MessageCircleHeart className="w-3.5 h-3.5 text-[#6E1B1E]" />
                  Lời nhắn ngắn
                </label>
                <input
                  type="text"
                  value={noteModal.note}
                  onChange={(e) => setNoteModal((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Chúc hai đứa trăm năm hạnh phúc..."
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F0E8] border border-[#E4DBD0] text-sm focus:outline-none focus:border-[#6E1B1E]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={() => {
                  setNoteModal({ open: false, uploadIds: [], name: '', note: '' });
                  setActiveTab('gallery');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#F5F0E8] text-[#6E5F5A] text-sm font-medium"
              >
                Bỏ qua
              </button>
              <button
                onClick={handleSaveNoteAndName}
                className="flex-1 py-2.5 rounded-xl bg-[#6E1B1E] text-[#FDFBF7] text-sm font-medium"
              >
                Lưu & xem album
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div className="flex items-center justify-between text-[#F5F0E8]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <MonogramTT className="w-7 h-7" color="#E6C9C9" cutout="#000000" />
              <span className="text-sm font-medium">{lightboxItem.guestName || 'Khách mời'}</span>
            </div>
            <button
              onClick={() => setLightboxItem(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center my-4 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem.mediaType === 'video' ? (
              <video
                src={lightboxItem.mediaUrl}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl"
              />
            ) : (
              <img
                src={optimizeCloudinaryUrl(lightboxItem.mediaUrl, 1400)}
                alt="Xem ảnh"
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            )}
          </div>

          <div
            className="max-w-lg w-full mx-auto bg-[#231B1A] text-[#F5F0E8] rounded-2xl p-4 flex items-center justify-between gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0">
              {lightboxItem.note ? (
                <p className="text-sm italic text-[#F5F0E8] line-clamp-2">“{lightboxItem.note}”</p>
              ) : (
                <p className="text-xs text-[#F5F0E8]/60">Khoảnh khắc từ {lightboxItem.guestName || 'khách mời'}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleLike(lightboxItem)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs flex items-center gap-1.5"
              >
                <Heart
                  className={`w-4 h-4 ${
                    likedIds.includes(lightboxItem.id) ? 'fill-[#E85D68] text-[#E85D68]' : ''
                  }`}
                />
                <span>{lightboxItem.likes || 0}</span>
              </button>
              <button
                onClick={() => handleDownloadOriginal(lightboxItem)}
                className="px-3 py-2 rounded-xl bg-[#6E1B1E] hover:bg-[#822226] text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Lưu ảnh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Portal Modal */}
      {adminOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[88vh] bg-[#FDFBF7] border border-[#E4DBD0] rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-[#E4DBD0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonogramTT className="w-8 h-8" cutout="#FDFBF7" />
                <span className="font-serif-display font-semibold text-base">Quản trị Album</span>
              </div>
              <button
                onClick={() => setAdminOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#F5F0E8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!adminUnlocked ? (
              <form onSubmit={handleUnlockAdmin} className="p-6 space-y-4">
                <p className="text-sm text-[#6E5F5A]">Nhập mã PIN quản trị (mặc định: 2026)</p>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F0E8] border border-[#E4DBD0] text-center text-lg tracking-widest focus:outline-none focus:border-[#6E1B1E]"
                  autoFocus
                />
                {pinError && <p className="text-xs text-red-600 text-center">Mã PIN chưa đúng.</p>}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#6E1B1E] text-[#FDFBF7] text-sm font-medium"
                >
                  Mở khóa
                </button>
              </form>
            ) : (
              <>
                <div className="px-5 pt-3 flex items-center gap-2 border-b border-[#E4DBD0]">
                  {[
                    { k: 'photos', label: `Ảnh (${uploads.length})` },
                    { k: 'prompts', label: 'Gợi ý chụp' },
                    { k: 'settings', label: 'Cài đặt & Tải về' },
                  ].map((t) => (
                    <button
                      key={t.k}
                      onClick={() => setAdminTab(t.k)}
                      className={`px-3 py-2 text-xs font-medium border-b-2 transition ${
                        adminTab === t.k
                          ? 'border-[#6E1B1E] text-[#6E1B1E]'
                          : 'border-transparent text-[#7A6B66]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                  {adminTab === 'photos' && (
                    <div className="space-y-2.5">
                      {uploads.length === 0 ? (
                        <p className="text-xs text-[#7A6B66] text-center py-6">Chưa có ảnh nào.</p>
                      ) : (
                        uploads.map((u) => (
                          <div
                            key={u.id}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                              u.isHidden
                                ? 'bg-[#F5F0E8]/60 border-dashed border-[#D3C6BC] opacity-65'
                                : 'bg-white border-[#E4DBD0]'
                            }`}
                          >
                            <img
                              src={optimizeCloudinaryUrl(u.mediaUrl, 200)}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover bg-[#EAE2D7] shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate">{u.guestName || 'Khách mời'}</p>
                              <p className="text-[11px] text-[#7A6B66] truncate">{u.note || 'Không có lời nhắn'}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleHide(u)}
                                className="p-2 rounded-lg hover:bg-[#F5F0E8] text-[#6E5F5A]"
                                title={u.isHidden ? 'Hiện lại' : 'Ẩn khỏi album & LED'}
                              >
                                {u.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUpload(u)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {adminTab === 'prompts' && (
                    <div className="space-y-4">
                      <form onSubmit={handleAddChallenge} className="bg-[#F5F0E8] p-3.5 rounded-2xl space-y-2.5">
                        <p className="text-xs font-semibold text-[#2A1F1D]">Thêm gợi ý chụp mới</p>
                        <input
                          type="text"
                          value={newPromptTitle}
                          onChange={(e) => setNewPromptTitle(e.target.value)}
                          placeholder="Tiêu đề (VD: Cả hội bạn thân)"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DBD0] text-xs"
                        />
                        <input
                          type="text"
                          value={newPromptDesc}
                          onChange={(e) => setNewPromptDesc(e.target.value)}
                          placeholder="Mô tả ngắn..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#E4DBD0] text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={newPromptTier}
                            onChange={(e) => setNewPromptTier(e.target.value)}
                            className="px-3 py-2 rounded-xl bg-white border border-[#E4DBD0] text-xs"
                          >
                            <option value="Tại bàn">Tại bàn</option>
                            <option value="Dạo quanh">Dạo quanh</option>
                            <option value="Đặc biệt">Đặc biệt</option>
                          </select>
                          <button
                            type="submit"
                            className="flex-1 py-2 rounded-xl bg-[#6E1B1E] text-[#FDFBF7] text-xs font-medium"
                          >
                            Thêm gợi ý
                          </button>
                        </div>
                      </form>

                      <div className="space-y-2">
                        {challenges.map((ch) => (
                          <div
                            key={ch.id}
                            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#E4DBD0]"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{ch.title}</p>
                              <p className="text-[11px] text-[#7A6B66] truncate">{ch.description}</p>
                            </div>
                            <button
                              onClick={() => handleToggleChallenge(ch)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                                ch.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {ch.isActive ? 'Đang bật' : 'Đang ẩn'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {adminTab === 'settings' && (
                    <div className="space-y-4">
                      <form onSubmit={handleUpdateGoal} className="bg-[#F5F0E8] p-4 rounded-2xl space-y-2.5">
                        <label className="block text-xs font-semibold text-[#2A1F1D]">
                          Mục tiêu Cuốn phim tối nay (số ảnh)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="10"
                            value={goalDraft}
                            onChange={(e) => setGoalDraft(e.target.value)}
                            className="w-28 px-3 py-2 rounded-xl bg-white border border-[#E4DBD0] text-sm"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-[#6E1B1E] text-[#FDFBF7] text-xs font-medium"
                          >
                            Cập nhật
                          </button>
                        </div>
                      </form>

                      <div className="bg-white border border-[#E4DBD0] p-4 rounded-2xl space-y-2.5">
                        <p className="text-xs font-semibold text-[#2A1F1D]">Tải toàn bộ ảnh gốc sau tiệc</p>
                        <p className="text-xs text-[#7A6B66]">
                          Toàn bộ ảnh và video chất lượng gốc nằm gọn trong thư mục <strong>wedding-album</strong> trên Cloudinary.
                        </p>
                        <a
                          href="https://console.cloudinary.com/console/media_library"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F6EAEB] text-[#6E1B1E] text-xs font-medium"
                        >
                          <span>Mở thư viện Cloudinary</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
