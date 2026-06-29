/**
 * Outfit style inspiration images — cached from image search.
 * Each style has 3 real outfit photos for the lookbook gallery.
 *
 * These are OSS-hosted URLs that are stable and embeddable.
 */

export interface StyleImage {
  url: string;
  source: string;
}

export const OUTFIT_STYLE_IMAGES: Record<string, StyleImage[]> = {
  casual: [
    { url: "https://sfile.chatglm.cn/images-ppt/5de014b4fa9c.jpg", source: "Lemon8" },
    { url: "https://sfile.chatglm.cn/images-ppt/029e845a3e5b.jpg", source: "Lemon8" },
    { url: "https://sfile.chatglm.cn/images-ppt/7c356a9fbe8c.jpg", source: "Lemon8" },
  ],
  streetwear: [
    { url: "https://sfile.chatglm.cn/images-ppt/1b1a58880020.jpg", source: "Lemon8" },
    { url: "https://sfile.chatglm.cn/images-ppt/6cb6b34204a6.jpg", source: "Lemon8" },
    { url: "https://sfile.chatglm.cn/images-ppt/4467697def19.jpg", source: "Lemon8" },
  ],
  korean: [
    { url: "https://sfile.chatglm.cn/images-ppt/fb200e8f63b5.jpg", source: "Lemon8" },
    { url: "https://sfile.chatglm.cn/images-ppt/8bcba7eae143.jpg", source: "Urbano Fashion" },
    { url: "https://sfile.chatglm.cn/images-ppt/c1b1459fa842.jpg", source: "Pinterest" },
  ],
  oldmoney: [
    { url: "https://sfile.chatglm.cn/images-ppt/af492204b054.jpg", source: "Hockerty" },
    { url: "https://sfile.chatglm.cn/images-ppt/7c9ba0e4794c.jpg", source: "Paddock Fashion" },
    { url: "https://sfile.chatglm.cn/images-ppt/1c02bf2f4fd5.jpg", source: "Grand Goldman" },
  ],
  sporty: [
    { url: "https://sfile.chatglm.cn/images-ppt/fea35f12cc8d.jpg", source: "Sumissura" },
    { url: "https://sfile.chatglm.cn/images-ppt/ffd469c3dfb4.jpg", source: "Style Rave" },
    { url: "https://sfile.chatglm.cn/images-ppt/260b73c24e6a.jpg", source: "Pinterest" },
  ],
  datenight: [
    { url: "https://sfile.chatglm.cn/images-ppt/c55fafe4e05f.jpg", source: "Javinishka" },
    { url: "https://sfile.chatglm.cn/images-ppt/249a5d799f77.jpg", source: "YouTube" },
    { url: "https://sfile.chatglm.cn/images-ppt/17607aaf5610.png", source: "Who What Wear" },
  ],
  minimalist: [
    { url: "https://sfile.chatglm.cn/images-ppt/ea8409407dd9.jpg", source: "Classic Six" },
    { url: "https://sfile.chatglm.cn/images-ppt/c8fa3f0fcb21.jpg", source: "Who What Wear" },
    { url: "https://sfile.chatglm.cn/images-ppt/2eb4ec0f8e30.jpg", source: "StyleCaster" },
  ],
};
