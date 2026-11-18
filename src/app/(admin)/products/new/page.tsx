"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { ArrowRight, Bold, CloudUpload, Image as ImageIcon, Italic, List, ListOrdered, Underline, X } from "lucide-react";
import { api } from "@/lib/api";

type UploadedImage = { file: File; preview: string };
type ProductGender = "men" | "women";
type ProductForm = { name: string; price: string; discountPercent: string; stock: string; description: string; category: ProductGender | "" };

const initialForm: ProductForm = { name: "", price: "", discountPercent: "0", stock: "", description: "", category: "" };
const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`Could not read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export default function AddProductPage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const imagesRef = useRef<UploadedImage[]>([]);
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => () => {
    imagesRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview));
  }, []);

  function addFiles(fileList: FileList | File[]) {
    const selected = Array.from(fileList);
    if (!selected.length) return;
    setError("");

    const valid: File[] = [];
    for (const file of selected) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`${file.name}: use a JPG, PNG, or WebP image.`);
      } else if (file.size > MAX_IMAGE_SIZE) {
        setError(`${file.name}: image size must not exceed 5 MB.`);
      } else {
        valid.push(file);
      }
    }

    const available = MAX_IMAGES - images.length;
    if (valid.length > available) setError(`You can upload up to ${MAX_IMAGES} images.`);
    const next = valid.slice(0, available).map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...next]);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeImage(index: number) {
    const removed = images[index];
    if (removed) URL.revokeObjectURL(removed.preview);
    setImages(images.filter((_, currentIndex) => currentIndex !== index));
  }

  function formatDescription(kind: "bold" | "italic" | "underline" | "list" | "ordered") {
    const input = descriptionInput.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = form.description.slice(start, end);
    const markers: Record<typeof kind, [string, string]> = {
      bold: ["**", "**"],
      italic: ["*", "*"],
      underline: ["__", "__"],
      list: ["- ", ""],
      ordered: ["1. ", ""],
    };
    const [before, after] = markers[kind];
    const replacement = `${before}${selected || "text"}${after}`;
    setForm((current) => ({ ...current, description: `${current.description.slice(0, start)}${replacement}${current.description.slice(end)}` }));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + before.length, start + replacement.length - after.length);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const price = Number(form.price);
    const discountPercent = Number(form.discountPercent);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      setError("Enter a valid price and a non-negative whole-number stock.");
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90) {
      setError("Discount must be between 0 and 90 percent.");
      return;
    }
    if (form.description.trim().length === 0) {
      setError("Product description is required.");
      return;
    }
    if (images.length === 0) {
      setError("Upload at least one product image.");
      return;
    }
    if (form.category !== "men" && form.category !== "women") {
      setError("Select whether this product is for men or women.");
      return;
    }

    setSaving(true);
    try {
      const uploadedImages: string[] = [];
      for (const { file } of images) {
        const image = await readAsDataUrl(file);
        const result = await api<{ url: string }>("/admin/products/upload", {
          method: "POST",
          body: JSON.stringify({ image }),
        });
        uploadedImages.push(result.url);
      }

      await api("/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          brand: "Timeora",
          category: form.category === "men" ? "Men" : "Women",
          gender: form.category,
          price,
          discountPercent,
          stock,
          images: uploadedImages,
          availability: "active",
        }),
      });
      router.push("/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-[1080px] pb-6">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/products" className="hover:text-slate-900">Products</Link>
          <ArrowRight size={14} />
          <span className="text-slate-800">Add Product</span>
        </div>
        <h2 className="text-[30px] font-semibold tracking-tight text-slate-950">Add Product</h2>
        <p className="mt-1 text-sm text-slate-600">Add a new product to your store.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={(event) => void submit(event)}>
        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.95fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label htmlFor="product-name" className="block text-sm font-medium text-slate-900">Product Name <span className="text-red-600">*</span></label>
            <input id="product-name" required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Linea Slim Quartz" className="mt-2 h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />

            <div className="mt-7 grid gap-5 sm:grid-cols-3">
              <label htmlFor="product-price" className="block text-sm font-medium text-slate-900">Price (₹) <span className="text-red-600">*</span>
                <input id="product-price" required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="e.g. 9,920" className="mt-2 h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />
              </label>
              <label htmlFor="product-discount" className="block text-sm font-medium text-slate-900">Discount (%) 
                <input id="product-discount" type="number" min="0" max="90" step="1" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} placeholder="0" className="mt-2 h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />
              </label>
              <label htmlFor="product-stock" className="block text-sm font-medium text-slate-900">Stock <span className="text-red-600">*</span>
                <input id="product-stock" required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} placeholder="e.g. 28" className="mt-2 h-[42px] w-full rounded-lg border border-slate-300 px-3 text-sm font-normal outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" />
              </label>
            </div>
            {Number(form.price) > 0 && Number(form.discountPercent) > 0 && Number(form.discountPercent) <= 90 && (
              <p className="mt-3 text-xs text-slate-600">
                Selling price after {form.discountPercent}% discount: <span className="font-semibold text-emerald-700">₹{Math.round(Number(form.price) * (1 - Number(form.discountPercent) / 100)).toLocaleString("en-IN")}</span>
              </p>
            )}

            <label htmlFor="product-description" className="mt-7 block text-sm font-medium text-slate-900">Description <span className="text-red-600">*</span></label>
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-300 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-100">
              <div className="flex h-10 items-center gap-1 border-b border-slate-200 px-2">
                <button type="button" aria-label="Bold" onClick={() => formatDescription("bold")} className="grid size-8 place-items-center rounded text-slate-700 hover:bg-slate-100"><Bold size={16} /></button>
                <button type="button" aria-label="Italic" onClick={() => formatDescription("italic")} className="grid size-8 place-items-center rounded text-slate-700 hover:bg-slate-100"><Italic size={16} /></button>
                <button type="button" aria-label="Underline" onClick={() => formatDescription("underline")} className="grid size-8 place-items-center rounded text-slate-700 hover:bg-slate-100"><Underline size={16} /></button>
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button type="button" aria-label="Bulleted list" onClick={() => formatDescription("list")} className="grid size-8 place-items-center rounded text-slate-700 hover:bg-slate-100"><List size={17} /></button>
                <button type="button" aria-label="Numbered list" onClick={() => formatDescription("ordered")} className="grid size-8 place-items-center rounded text-slate-700 hover:bg-slate-100"><ListOrdered size={17} /></button>
              </div>
              <textarea ref={descriptionInput} id="product-description" required maxLength={4000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Write product description..." className="min-h-[170px] w-full resize-y px-4 py-3 text-sm outline-none placeholder:text-slate-400" />
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="flex items-center gap-3 text-base font-semibold text-slate-950"><ImageIcon size={20} /> Product Images <span className="text-red-600">*</span></h3>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFileChange} className="hidden" />
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileInput.current?.click(); }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`mt-3 flex min-h-[145px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${dragging ? "border-slate-700 bg-slate-50" : "border-slate-300 hover:bg-slate-50"}`}
              >
                <CloudUpload size={30} strokeWidth={1.8} className="text-slate-800" />
                <p className="mt-2 text-sm font-medium text-slate-900">Click to upload or drag and drop</p>
                <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP (Max 5 MB each)</p>
                <span className="mt-3 rounded-lg bg-[#151515] px-5 py-2 text-sm font-medium text-white">Choose Images</span>
              </div>
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3">
                  {images.map(({ file, preview }, index) => (
                    <div key={`${file.name}-${file.lastModified}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <Image src={preview} alt={file.name} fill unoptimized className="object-cover" />
                      <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeImage(index)} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/80 text-white transition-colors hover:bg-red-600"><X size={14} /></button>
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-1 text-[10px] text-white">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500">{images.length}/{MAX_IMAGES} images selected</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <label htmlFor="product-category" className="block text-sm font-medium text-slate-900">Category <span className="text-red-600">*</span></label>
              <select id="product-category" required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ProductGender | "" }))} className="mt-2 h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100">
                <option value="">Select category</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </section>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" disabled={saving} onClick={() => router.push("/products")} className="min-w-[150px] rounded-lg border border-slate-400 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={saving} className="min-w-[170px] rounded-lg bg-[#151515] px-5 py-2.5 text-sm font-medium text-white hover:bg-black disabled:opacity-60">{saving ? "Adding Product…" : "Add Product"}</button>
        </div>
      </form>
    </section>
  );
}
