interface Props {
  name: string;
  pictureUrl?: string;
  size?: "md" | "lg";
}

const SIZES = {
  md: "size-10 text-base",
  lg: "size-[72px] text-2xl",
};

export function Avatar({ name, pictureUrl, size = "md" }: Props) {
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${SIZES[size]} shrink-0 rounded-full bg-neutral-200 object-cover`}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-600`}
    >
      {name.slice(0, 1)}
    </div>
  );
}
