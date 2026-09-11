import subset from "@/lib/icon-subset.json";

const ICONS = subset.icons as Record<
  string,
  { body: string; width?: number; height?: number }
>;

type IcProps = Omit<React.SVGProps<SVGSVGElement>, "dangerouslySetInnerHTML"> & {
  icon: string;
};

export function Ic({ icon, ...rest }: IcProps) {
  const data = ICONS[icon];
  if (!data) return null;
  const w = data.width ?? subset.width;
  const h = data.height ?? subset.height;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      width="1em"
      height="1em"
      {...rest}
      dangerouslySetInnerHTML={{ __html: data.body }}
    />
  );
}
