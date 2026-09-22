export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "MIEMBRO";
  hogarId: string;
};

export type Hogar = {
  id: string;
  nombre: string;
};

export type Ingrediente = {
  id: string;
  nombre: string;
  unidadBase: string;
  tipoUnidad: "MASA" | "VOLUMEN" | "UNIDAD";
};

export type RecetaIngrediente = {
  id: string;
  cantidad: number;
  unidad: string;
  ingrediente: Ingrediente;
};

export type Receta = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  pasos: string;
  tiempoMin?: number | null;
  porciones: number;
  fotoUrl?: string | null;
  origen: "MANUAL" | "IMPORTADA_JSON" | "IMPORTADA_URL";
  ingredientes: RecetaIngrediente[];
};

export type IngredienteInput = {
  nombre: string;
  cantidad: number;
  unidad: string;
};

export type RecetaInput = {
  nombre: string;
  descripcion?: string;
  pasos: string;
  tiempoMin?: number;
  porciones: number;
  fotoUrl?: string;
  ingredientes: IngredienteInput[];
};

export type ItemListaCompra = {
  nombre: string;
  cantidad: number;
  unidad: string;
};
