interface PlaceholderTabProps {
  title: string;
  description: string;
}

export default function PlaceholderTab({ title, description }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}
