// Homepage banners, served by the console rather than compiled into the build.
//
// They used to be a list in BannerCarousel.jsx pointing at files in
// public/banners/, so changing one took a code edit, a rebuild and a deploy.
// Whoever runs the shop changes them from the console now.
//
// Every failure here is silent on purpose. The carousel keeps the banners that
// shipped with the build, which is a worse-but-fine homepage; throwing would
// give the visitor a blank hero, which looks like a broken shop.

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function fetchBanners() {
  if (!API_BASE) return [];
  try {
    const res = await fetch(`${API_BASE}/api/banners`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.banners || [])
      .filter((b) => b && b.src)
      .map((b) => ({ src: b.src, alt: b.alt || "", to: b.to || "/" }));
  } catch {
    return [];
  }
}
