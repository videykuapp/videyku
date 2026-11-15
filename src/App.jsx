
import { useEffect, useState } from "react";
import {
  Link, Route, Routes, useParams
} from "react-router-dom";
import { supabase } from "./supabase";
import AdSlot from "./components/AdSlot";
import {
  UploadCloud, Copy, ArrowLeft
} from "lucide-react";

function SetupNotice() {
  return (
    <main className="narrow">
      <h1>Hubungkan Videyku</h1>
      <p>Periksa konfigurasi Supabase di Vercel.</p>
    </main>
  );
}

function Header() {
  return (
    <header className="topbar">
      <Link className="brand" to="/">
        VIDEYKU<span>.</span>
      </Link>
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

    if (!file.type.startsWith("video/")) {
      setMessage("File harus berupa video.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setMessage("Ukuran maksimum adalah 50 MB.");
      return;
    }

    setProgress(true);
    setMessage("");

    const id = crypto.randomUUID();
    const safeName = file.name.replace(
      /[^a-zA-Z0-9._-]/g, "_"
    );
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

    window.location.href = `/v/${id}`;
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
          />
        </label>

        <label className="file-picker">
          <UploadCloud size={28}/>
          <b>{file ? file.name : "Pilih video dari perangkat"}</b>
          <small>MP4, MOV, WebM • Maks. 50 MB</small>
          <input
            type="file"
            accept="video/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
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
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        if (live) {
          setError(
            error
              ? `Gagal mengambil video: ${error.message}`
              : "Video tidak ditemukan."
          );
        }
        return;
      }

      const videoUrl = data.public_url ||
        supabase.storage
          .from("videos")
          .getPublicUrl(data.storage_path).data.publicUrl;

      if (live) {
        setVideo({ ...data, videoUrl });
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
          src={video.videoUrl}
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
            await navigator.clipboard.writeText(
              window.location.href
            );
            setCopied(true);
          }}
        >
          <Copy size={16}/>
          {copied ? "Tersalin" : "Salin link"}
        </button>
      </div>

      <AdSlot/>
    </main>
  );
}

export default function App() {
  if (!supabase) return <SetupNotice />;

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
