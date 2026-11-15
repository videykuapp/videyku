
import { useEffect, useState } from "react";
import {
  Link, Route, Routes, useNavigate, useParams
} from "react-router-dom";
import { supabase } from "./supabase";
import AdSlot from "./components/AdSlot";
import {
  UploadCloud, Play, LogIn, LogOut, Trash2,
  Copy, Video, ArrowLeft
} from "lucide-react";

function SetupNotice() {
  return (
    <main className="narrow">
      <h1>Hubungkan Videyku</h1>
      <p>Konfigurasi Supabase belum diisi. Periksa pengaturan environment Vercel.</p>
    </main>
  );
}

function Header({ session, onLogout }) {
  return (
    <header className="topbar">
      <Link className="brand" to="/">VIDEYKU<span>.</span></Link>
      <nav>
        <Link to="/">Video</Link>
        {session ? (
          <>
            <Link to="/upload">Upload</Link>
            <button className="text-btn" onClick={onLogout}>
              <LogOut size={16}/> Keluar
            </button>
          </>
        ) : (
          <Link to="/admin"><LogIn size={16}/> Admin</Link>
        )}
      </nav>
    </header>
  );
}


function Home() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">UPLOAD • SHARE • WATCH</div>
        <h1>Bagikan video<br/><em>dengan mudah.</em></h1>
        <p>Unggah video dan bagikan tautannya.</p>
        <Link className="primary" to="/upload">
          <UploadCloud size={18}/> Upload video
        </Link>
      </section>
      <AdSlot />
    </>
  );
}

      
function Admin({ session }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (error) {
      setError("Login gagal. Periksa email dan kata sandi admin.");
    }

    setBusy(false);
  }

  if (session) {
    return (
      <main className="narrow">
        <div className="eyebrow">ADMIN</div>
        <h1>Dashboard admin</h1>
        <p className="muted">Akun admin aktif.</p>
        <Link className="primary" to="/upload">
          <UploadCloud size={18}/> Upload video
        </Link>
      </main>
    );
  }

  return (
    <main className="narrow">
      <div className="eyebrow">PRIVATE ACCESS</div>
      <h1>Login admin</h1>
      <p className="muted">Halaman ini hanya untuk pengelola website.</p>

      <form className="panel form" onSubmit={login}>
        <label>
          Email admin
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)} required/>
        </label>
        <label>
          Kata sandi
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)} required/>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}

function UploadPage({ session }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  async function upload(e) {
    e.preventDefault();

    if (!file) {
      setMessage("Pilih file video terlebih dahulu.");
      return;
    }

    if (!file.type.startsWith("video/")) {
      setMessage("File harus berupa video.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setMessage("Ukuran maksimum konfigurasi awal adalah 500 MB.");
      return;
    }

    setProgress(true);
    setMessage("");

    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${id}/${safeName}`;

    const { error: storageError } = await supabase.storage
      .from("videos")
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      setMessage(`Upload gagal: ${storageError.message}`);
      setProgress(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("videos")
      .getPublicUrl(path);

    const { error: dbError } = await supabase
      .from("videos")
      .insert({
        id,
        title: title.trim() || file.name,
        storage_path: path,
        public_url: publicData.publicUrl
      });

    if (dbError) {
      await supabase.storage.from("videos").remove([path]);
      setMessage(`Gagal menyimpan data: ${dbError.message}`);
      setProgress(false);
      return;
    }

    window.location.href = `https://videyku-two.vercel.app/v/${id}`;
  }

  return (
    <main className="narrow">
      <Link className="back" to="/">
        <ArrowLeft size={16}/> Kembali
      </Link>
      <div className="eyebrow">UPLOAD VIDEO</div>
      <h1>Tambahkan video</h1>

      <form className="panel form" onSubmit={upload}>
        <label>
          Judul video
          <input value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Contoh: Video liburan"/>
        </label>

        <label className="file-picker">
          <UploadCloud size={28}/>
          <b>{file ? file.name : "Pilih video dari perangkat"}</b>
          <small>MP4, MOV, WebM • Maks. 50 MB</small>
          <input type="file" accept="video/*"
            onChange={e => setFile(e.target.files?.[0] || null)}/>
        </label>

        {message && <p className="error">{message}</p>}

<button className="primary" disabled={progress}>
        
          {progress ? "Mengunggah…" : "Upload sekarang"}
        </button>

        <small className="muted">
          Unggah video yang Anda miliki atau berhak bagikan.
        </small>
      </form>
    </main>
  );
}

function VideoPage({ session }) {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let live = true;

    async function load() {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        if (live) setError("Video tidak ditemukan.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("videos")
        .getPublicUrl(data.storage_path);

      if (live) {
        setVideo(data);
        setUrl(publicData.publicUrl);
      }
    }

    load();
    return () => { live = false; };
  }, [id]);

  async function remove() {
    if (!session || !video || !confirm("Hapus video ini?")) return;

    await supabase.storage.from("videos").remove([video.storage_path]);
    await supabase.from("videos").delete().eq("id", id);
    navigate("/");
  }

  if (error) {
    return (
      <main className="narrow">
        <h1>{error}</h1>
        <Link to="/">Kembali ke beranda</Link>
      </main>
    );
  }

  if (!video) {
    return <main className="narrow">Memuat video…</main>;
  }

  return (
    <main className="watch">
      <Link className="back" to="/">
        <ArrowLeft size={16}/> Semua video
      </Link>

      <div className="player">
        <video controls playsInline preload="metadata" src={url}>
          Browser kamu tidak mendukung pemutar video.
        </video>
      </div>

      <h1>{video.title}</h1>

      <div className="share">
        <input readOnly value={window.location.href}/>
        <button className="secondary" onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        }}>
          <Copy size={16}/> {copied ? "Tersalin" : "Salin link"}
        </button>

        {session && (
          <button className="danger" onClick={remove}>
            <Trash2 size={16}/> Hapus
          </button>
        )}
      </div>

      <AdSlot/>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => setSession(s)
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabase) return <SetupNotice />;
  if (!ready) return <main className="narrow">Memuat Videyku…</main>;

  return (
    <div className="app-shell">
      <Header
        session={session}
        onLogout={() => supabase.auth.signOut()}
      />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin session={session} />} />
          <Route path="/upload" element={<UploadPage session={session} />} />
          <Route path="/v/:id" element={<VideoPage session={session} />} />
        </Routes>
      </div>
      <footer>
        © {new Date().getFullYear()} Videyku. Upload and share responsibly.
      </footer>
    </div>
  );
}
