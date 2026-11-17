import { useEffect, useState } from "react";
import {
  Link, Route, Routes, useParams
} from "react-router-dom";
import AdSlot from "./components/AdSlot";
import {
  UploadCloud, Copy, ArrowLeft
} from "lucide-react";

const API_BASE = "https://videyku-api.angelokasino2.workers.dev";
const SMARTLINK_URL = "https://araplhn.org/4/f65190742ded7809cbc5d0af019e2a42";
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function Header() {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        VIDEYKU<span>.</span>
      </Link>
    </header>
  );
}

function SmartLinkAd() {
  return (
    <div
      style={{
        margin: "18px auto",
        padding: "14px",
        maxWidth: "420px",
        textAlign: "center",
        border: "1px solid rgba(128,128,128,.3)",
        borderRadius: "10px",
      }}
    >
      <small style={{ display: "block", marginBottom: "8px" }}>Iklan / Sponsor</small>
      <a
        href={SMARTLINK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        style={{ display: "inline-block", fontWeight: 600 }}
      >
        Kunjungi sponsor
      </a>
    </div>
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
      <SmartLinkAd />
    </>
  );
}

function UploadPage() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(e) {
    e.preventDefault();

    if (!file) {
      setMessage("Pilih file video terlebih dahulu.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setMessage("Format harus MP4, MOV, atau WebM.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage("Ukuran maksimum adalah 100 MB.");
      return;
    }

    setProgress(true);
    setMessage("");

    try {
      const videoTitle = (title.trim() || file.name).slice(0, 120);
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-Video-Title": videoTitle
        },
        body: file
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.id) {
        throw new Error(result.error || "Upload gagal. Coba lagi.");
      }

      window.location.href = `/v/${encodeURIComponent(result.id)}`;
    } catch (error) {
      setMessage(error.message || "Tidak dapat terhubung ke server.");
      setProgress(false);
    }
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
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Judul video"
            maxLength={120}
          />
        </label>

        <label className="file-picker">
          <UploadCloud size={28}/>
          <b>{file ? file.name : "Pilih video dari perangkat"}</b>
          <small>MP4, MOV, WebM • Maks. 100 MB</small>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={e => {
              setFile(e.target.files?.[0] || null);
              setMessage("");
            }}
          />
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

function VideoPage() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;

    async function load() {
      try {
        const response = await fetch(
          `${API_BASE}/api/video/${encodeURIComponent(id)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Video tidak ditemukan.");
        }

        if (live) setVideo(data);
      } catch (error) {
        if (live) {
          setError(error.message || "Gagal mengambil video.");
        }
      }
    }

    load();

    return () => {
      live = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="narrow">
        <h1>{error}</h1>
        <Link to="/">Kembali</Link>
      </main>
    );
  }

  if (!video) {
    return <main className="narrow">Memuat video…</main>;
  }

  return (
    <main className="watch">
      <div className="player">
        <video
          controls
          playsInline
          preload="metadata"
          src={video.playback_url}
        >
          Browser kamu tidak mendukung pemutar video.
        </video>
      </div>

      <h1>{video.title}</h1>

      <div className="share">
        <input readOnly value={window.location.href}/>

        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
            } catch {
              setError("Gagal menyalin link. Salin alamat dari browser.");
            }
          }}
        >
          <Copy size={16}/>
          {copied ? "Tersalin" : "Salin link"}
        </button>
      </div>

      <AdSlot/>
      <SmartLinkAd />
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Header />

      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/v/:id" element={<VideoPage />} />
        </Routes>
      </div>

      <footer>
        © {new Date().getFullYear()} Videyku. Upload and share responsibly.
      </footer>
    </div>
  );
}
