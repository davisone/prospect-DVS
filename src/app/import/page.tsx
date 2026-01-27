import { CsvUploader } from '@/components/import/CsvUploader';

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import CSV</h1>
        <p className="text-muted-foreground">
          Importez vos prospects depuis un fichier CSV
        </p>
      </div>

      <CsvUploader />
    </div>
  );
}
