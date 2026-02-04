import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Cabeçalho de coluna ordenável.
 * @param {string} columnKey - Chave da coluna (enviada ao backend como sort_by).
 * @param {string} label - Texto exibido no cabeçalho.
 * @param {string} sortBy - Coluna atualmente ordenada.
 * @param {string} sortDir - 'asc' ou 'desc'.
 * @param {function} onSort - Chamado ao clicar: onSort(columnKey) — o pai pode alternar sortDir se já for a coluna ativa.
 * @param {string} className - Classes adicionais (ex.: text-right).
 */
export function SortableTableHead({ columnKey, label, sortBy, sortDir, onSort, className }) {
  const isActive = sortBy === columnKey;
  const Icon = !isActive ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn('font-semibold', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 font-semibold text-foreground hover:bg-muted/70 hover:text-foreground"
        onClick={() => onSort(columnKey)}
      >
        {label}
        <Icon className={cn('ml-1.5 h-4 w-4', isActive && 'text-primary')} />
      </Button>
    </TableHead>
  );
}
