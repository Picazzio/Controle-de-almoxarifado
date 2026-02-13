import React from 'react';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

const PER_PAGE_OPTIONS = [15, 25, 50, 100];

/** Gera números de página para exibir (ex.: 1, 2, 3 ... 10) com elipses */
function getPageNumbers(current, lastPage) {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('ellipsis');
    pages.push(lastPage);
  } else if (current >= lastPage - 3) {
    pages.push(1);
    pages.push('ellipsis');
    for (let i = lastPage - 4; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('ellipsis');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('ellipsis');
    pages.push(lastPage);
  }
  return pages;
}

/**
 * Barra de paginação reutilizável para listas da API Laravel (resposta paginate).
 * Exibe sempre os botões Anterior/Próxima e, quando há várias páginas, botões numerados.
 */
export default function PaginationBar({
  pagination,
  onPageChange,
  onPerPageChange,
  className = '',
}) {
  const { current_page = 1, last_page = 1, per_page = 15, total = 0 } = pagination || {};
  const from = total === 0 ? 0 : (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  if (total === 0 && last_page <= 1) {
    return (
      <div className={cn('flex flex-wrap items-center justify-between gap-4 pt-4', className)}>
        <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
      </div>
    );
  }

  const pageNumbers = getPageNumbers(current_page, last_page);

  return (
    <div className={cn('flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-4 pt-4', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-foreground">{from}</span> a{' '}
          <span className="font-medium text-foreground">{to}</span> de{' '}
          <span className="font-medium text-foreground">{total}</span> resultados
        </p>
        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Itens por página:</span>
            <Select
              value={String(per_page)}
              onValueChange={(v) => onPerPageChange(Number(v))}
            >
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Navegação: sempre visível quando há dados */}
      <nav className="flex flex-wrap items-center gap-1 sm:gap-2" aria-label="Navegação entre páginas">
        <Button
          variant="outline"
          size="sm"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
          className="gap-1 shrink-0"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {last_page > 1 && (
          <div className="flex items-center gap-1">
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm" aria-hidden>
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={current_page === p ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'min-w-[2rem] h-9 px-2',
                    current_page === p && 'bg-[#0c4a6e] hover:bg-[#0c4a6e]/90'
                  )}
                  onClick={() => onPageChange(p)}
                  aria-label={`Ir para página ${p}`}
                  aria-current={current_page === p ? 'page' : undefined}
                >
                  {p}
                </Button>
              )
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
          className="gap-1 shrink-0"
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
