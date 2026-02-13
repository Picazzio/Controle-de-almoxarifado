import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const STATUS_OPTIONS = [
  { label: 'Ativo', value: 'active' },
  { label: 'Manutenção', value: 'maintenance' },
  { label: 'Baixado', value: 'written_off' },
  { label: 'Reservado', value: 'reserved' },
];

/**
 * Modal de cadastro/edição de ativo imobilizado.
 * @param {Object} formData - Dados do formulário
 * @param {Function} onInputChange - (e) => setFormData(...)
 * @param {Function} onFieldChange - (field, value) => setFormData(...)
 * @param {Array} categories - Lista de categorias { id, name }
 * @param {Array} departments - Lista de departamentos { id, name }
 * @param {Function} onSubmit - (e) => submit
 * @param {string} submitText - Texto do botão
 */
function FixedAssetForm({
  formData,
  onInputChange,
  onFieldChange,
  categories,
  departments,
  onSubmit,
  submitText,
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patrimony_code">Etiqueta <span className="text-destructive">*</span></Label>
        <Input
          id="patrimony_code"
          name="patrimony_code"
          value={formData.patrimony_code ?? ''}
          onChange={onInputChange}
          placeholder="Ex: 1 ou 00001 (será gravado com 5 dígitos)"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            value={formData.name ?? ''}
            onChange={onInputChange}
            placeholder="Ex: Notebook Dell"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Marca</Label>
          <Input
            id="brand"
            name="brand"
            value={formData.brand ?? ''}
            onChange={onInputChange}
            placeholder="Ex: Dell, HP"
          />
        </div>
      </div>

      <div className="space-y-2 w-full">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description ?? ''}
          onChange={onInputChange}
          placeholder="Ex: Processador i7, 16GB RAM, SSD 512GB, Detalhes de avarias..."
          rows={3}
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serial_number">N/S (Número de Série)</Label>
        <Input
          id="serial_number"
          name="serial_number"
          value={formData.serial_number ?? ''}
          onChange={onInputChange}
          placeholder="Número de série do fabricante"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={formData.category_id ? String(formData.category_id) : ''}
            onValueChange={(value) => onFieldChange('category_id', value ? Number(value) : '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Departamento (Localização)</Label>
          <Select
            value={formData.department_id ? String(formData.department_id) : ''}
            onValueChange={(value) => onFieldChange('department_id', value ? Number(value) : '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="acquisition_date">Data de Aquisição</Label>
          <Input
            id="acquisition_date"
            name="acquisition_date"
            type="date"
            value={formData.acquisition_date ?? ''}
            onChange={onInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisition_value">Valor (R$)</Label>
          <Input
            id="acquisition_value"
            name="acquisition_value"
            type="number"
            step="0.01"
            min="0"
            value={formData.acquisition_value ?? ''}
            onChange={onInputChange}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status ?? 'active'}
          onValueChange={(value) => onFieldChange('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]">
        {submitText}
      </Button>
    </form>
  );
}

export default FixedAssetForm;
export { STATUS_OPTIONS };
