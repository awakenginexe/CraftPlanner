import type { Item } from "../domain/types";

type SearchSelectProps = {
  items: Item[];
  value: string;
  onChange: (itemId: string) => void;
  placeholder?: string;
};

export function SearchSelect({ items, value, onChange, placeholder = "Select item" }: SearchSelectProps) {
  return (
    <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>{item.name}</option>
      ))}
    </select>
  );
}
