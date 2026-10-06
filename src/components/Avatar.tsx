export function Avatar({ name, pictureUrl }: { name: string; pictureUrl?: string }) {
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="size-10 shrink-0 rounded-full bg-neutral-200 object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-600"
    >
      {name.slice(0, 1)}
    </div>
  );
}
