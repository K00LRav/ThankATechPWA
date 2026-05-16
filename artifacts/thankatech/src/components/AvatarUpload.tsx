import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl: string | null | undefined;
  fullName: string | null | undefined;
  className?: string;
}

export function AvatarUpload({ avatarUrl, fullName, className }: AvatarUploadProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { uploadFile, isUploading } = useUpload({
    onError: (err) => toast.error("Upload failed: " + err.message),
  });

  const initials = fullName
    ? fullName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const result = await uploadFile(file);
    if (!result) {
      setPreview(null);
      return;
    }

    const avatarUrl = `/api/storage${result.objectPath}`;

    const res = await fetch("/api/profile/me/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ avatarUrl }),
    });

    if (!res.ok) {
      setPreview(null);
      toast.error("Failed to save avatar");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    toast.success("Profile photo updated!");
  }

  const displayUrl = preview ?? avatarUrl ?? undefined;

  return (
    <div className="relative group inline-block">
      <Avatar className={cn("border-4 border-background shadow-lg", className)}>
        <AvatarImage src={displayUrl} alt={fullName ?? "Avatar"} />
        <AvatarFallback className="text-2xl font-serif font-bold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <button
        type="button"
        onClick={() => !isUploading && inputRef.current?.click()}
        aria-label="Change profile photo"
        className={cn(
          "absolute inset-0 rounded-full flex items-center justify-center",
          "bg-black/0 group-hover:bg-black/40 transition-colors duration-200",
          isUploading && "bg-black/40 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
