export type EntryType =
  | "small_molecule"
  | "peptide"
  | "monoclonal_antibody"
  | "antibody_drug_conjugate"
  | "fusion_protein"
  | "oligonucleotide"
  | "cell_gene_therapy"
  | "other";

export interface Drug {
  id: string;
  inn_name: string;
  inn_name_latin: string | null;
  inn_name_french: string | null;
  inn_name_spanish: string | null;
  is_recommended: boolean;
  entry_type: EntryType;
  molecular_formula: string | null;
  cas_number: string | null;
  chemical_name: string | null;
  chemical_name_french: string | null;
  chemical_name_spanish: string | null;
  action_and_use: string | null;
  action_and_use_french: string | null;
  action_and_use_spanish: string | null;
  list_number: number;
  publication_date: string | null;
  source_pdf_url: string;
  source_page: number | null;
  extraction_run: string;
}

export interface DrugsResponse {
  data: Drug[];
  total: number;
  page: number;
  pageSize: number;
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  small_molecule: "Small Molecule",
  peptide: "Peptide",
  monoclonal_antibody: "Monoclonal Antibody",
  antibody_drug_conjugate: "ADC",
  fusion_protein: "Fusion Protein",
  oligonucleotide: "Oligonucleotide",
  cell_gene_therapy: "Cell/Gene Therapy",
  other: "Other",
};

export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  small_molecule: "bg-blue-100 text-blue-800",
  peptide: "bg-green-100 text-green-800",
  monoclonal_antibody: "bg-purple-100 text-purple-800",
  antibody_drug_conjugate: "bg-pink-100 text-pink-800",
  fusion_protein: "bg-orange-100 text-orange-800",
  oligonucleotide: "bg-yellow-100 text-yellow-800",
  cell_gene_therapy: "bg-red-100 text-red-800",
  other: "bg-gray-100 text-gray-800",
};
