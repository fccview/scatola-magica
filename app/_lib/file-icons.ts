export interface FileIconInfo {
  materialIcon: string;
  extension?: string;
}

export const getFileIcon = (fileName: string): string => {
  const info = getFileIconInfo(fileName);
  return info.materialIcon;
}

export const getFileIconInfo = (fileName: string): FileIconInfo => {
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";

  if (!ext) {
    return { materialIcon: "insert_drive_file" };
  }

  const useMaterialIcon = ["gpg"];

  const materialIconMap: Record<string, string> = {
    pdf: "picture_as_pdf",
    doc: "description",
    docx: "description",
    xls: "table_chart",
    xlsx: "table_chart",
    ppt: "slideshow",
    pptx: "slideshow",
    txt: "text_snippet",
    rtf: "text_snippet",
    md: "text_snippet",
    json: "code",
    xml: "code",
    html: "code",
    css: "code",
    js: "code",
    ts: "code",
    jsx: "code",
    tsx: "code",
    py: "code",
    java: "code",
    cpp: "code",
    c: "code",
    cs: "code",
    php: "code",
    rb: "code",
    go: "code",
    rs: "code",
    swift: "code",
    kt: "code",
    sh: "terminal",
    bat: "terminal",
    ps1: "terminal",
    zip: "folder_zip",
    rar: "folder_zip",
    "7z": "folder_zip",
    tar: "folder_zip",
    gz: "folder_zip",
    jar: "folder_zip",
    mp3: "audio_file",
    wav: "audio_file",
    flac: "audio_file",
    aac: "audio_file",
    ogg: "audio_file",
    m4a: "audio_file",
    mp4: "video_file",
    avi: "video_file",
    mkv: "video_file",
    mov: "video_file",
    wmv: "video_file",
    flv: "video_file",
    webm: "video_file",
    m4v: "video_file",
    jpg: "image",
    jpeg: "image",
    png: "image",
    gif: "image",
    webp: "image",
    svg: "image",
    bmp: "image",
    ico: "image",
    tiff: "image",
    psd: "image",
    ai: "image",
    sketch: "image",
    ps: "image",
    eps: "image",
    db: "storage",
    sqlite: "storage",
    sql: "storage",
    mdb: "storage",
    accdb: "storage",
    exe: "settings_applications",
    msi: "settings_applications",
    dmg: "settings_applications",
    pkg: "settings_applications",
    deb: "settings_applications",
    rpm: "settings_applications",
    apk: "phone_android",
    ipa: "phone_android",
    iso: "disc_full",
    bin: "disc_full",
    font: "text_fields",
    ttf: "text_fields",
    otf: "text_fields",
    woff: "text_fields",
    woff2: "text_fields",
    eot: "text_fields",
    gpg: "lock",
  };

  const materialIcon = materialIconMap[ext] || "insert_drive_file";

  if (useMaterialIcon.includes(ext)) {
    return {
      materialIcon,
    };
  }

  return {
    materialIcon,
    extension: ext,
  };
}
