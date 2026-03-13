import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { SortableTableHead } from '../components/ui/sortable-table-head';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Search, Filter, Download, Calendar, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../components/PaginationBar';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 30,
    total: 0,
  });

  const loadLogs = useCallback((page, perPage) => {
    const params = { page, per_page: perPage, sort_by: sortBy, sort_dir: sortDir };
    if (searchTerm) params.search = searchTerm;
    if (filterType !== 'all') params.type = filterType;
    if (filterResource !== 'all') params.resource = filterResource;
    api.get('/logs', { params }).then((res) => {
      setLogs(res.data.data || []);
      setPagination({
        current_page: res.data.current_page ?? 1,
        last_page: res.data.last_page ?? 1,
        per_page: res.data.per_page ?? perPage,
        total: res.data.total ?? 0,
      });
    });
  }, [searchTerm, filterType, filterResource, sortBy, sortDir]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current_page: 1 }));
  }, [searchTerm, filterType, filterResource]);

  useEffect(() => {
    loadLogs(pagination.current_page, pagination.per_page);
  }, [loadLogs, pagination.current_page, pagination.per_page]);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, current_page: newPage }));
  };

  const handlePerPageChange = (newPerPage) => {
    setPagination((prev) => ({ ...prev, per_page: newPerPage, current_page: 1 }));
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir(column === 'created_at' ? 'desc' : 'asc');
    }
  };

  const actionTypes = [
    { value: 'created', label: 'Criação' },
    { value: 'updated', label: 'Edição' },
    { value: 'deleted', label: 'Exclusão' },
  ];
  const resourceTypes = ['Produto', 'Usuário', 'Departamento', 'Categoria', 'Função', 'Movimentação', 'Patrimônio'];

  const getActionColor = (eventType) => {
    const t = (eventType || '').toLowerCase();
    if (t === 'created' || t === 'create') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (t === 'updated' || t === 'update') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t === 'deleted' || t === 'delete') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-muted text-foreground border-border';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatChangeValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const filteredLogs = logs;

  const exportToCSV = () => {
    const headers = ['ID', 'Usuário', 'Ação', 'Recurso', 'Item Afetado', 'Data/Hora', 'IP'];
    const csvData = filteredLogs.map((log) => [
      log.id,
      log.user_name ?? log.user,
      log.description ?? log.action,
      log.resource_label ?? log.resource,
      log.subject_name ?? log.resource_name ?? log.resourceName,
      formatDate(log.created_at ?? log.timestamp),
      log.ip ?? '',
    ]);
    const csv = [headers.join(','), ...csvData.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in min-h-0 flex-1">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel de Auditoria</h1>
        <p className="text-muted-foreground mt-1 text-sm">Registro de atividades e alterações no sistema</p>
      </div>

      <Card className="border-border flex-1 flex flex-col min-h-0">
        <CardContent className="p-6 flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0 items-center flex-wrap">
            <div className="relative flex-1 w-full min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="search-logs-input"
                placeholder="Buscar por usuário ou recurso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-type-select" className="w-full sm:w-[160px]">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ações</SelectItem>
                {actionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger data-testid="filter-resource-select" className="w-full sm:w-[160px]">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Recurso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Recursos</SelectItem>
                {resourceTypes.map((resource) => (
                  <SelectItem key={resource} value={resource}>
                    {resource}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button data-testid="export-logs-btn" onClick={exportToCSV} size="icon" className="h-9 w-9 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af] hover:opacity-90 shrink-0" aria-label="Exportar CSV">
              <Download className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-table border border-border rounded-md" aria-label="Tabela de logs com rolagem">
            <div className="min-w-0">
              <table className="w-full caption-bottom text-sm border-collapse">
                <thead className="[&_tr]:border-b">
                  <TableRow className="sticky top-0 z-20 border-b border-border bg-background shadow-[0_1px_0_0_hsl(var(--border))] hover:bg-background [&_th]:bg-background [&_th]:shadow-[0_1px_0_0_hsl(var(--border))]">
                    <TableHead className="w-10 h-10 px-2 bg-background first:rounded-tl-md" />
                    <SortableTableHead columnKey="created_at" label="Data/Hora" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="h-10 px-2 bg-background" />
                    <TableHead className="font-semibold h-10 px-2 bg-background">Usuário</TableHead>
                    <SortableTableHead columnKey="description" label="Ação" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="h-10 px-2 bg-background" />
                    <TableHead className="font-semibold h-10 px-2 bg-background">Item Afetado</TableHead>
                    <TableHead className="font-semibold h-10 px-2 bg-background hidden md:table-cell last:rounded-tr-md">IP</TableHead>
                  </TableRow>
                </thead>
                <TableBody>
                {filteredLogs.map((log) => {
                  const hasDetails = log.changes && log.changes.length > 0;
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <TableRow data-testid={`log-row-${log.id}`} className="hover:bg-muted/50">
                        <TableCell className="w-10 py-2">
                          {hasDetails ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              aria-label={isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          ) : (
                            <span className="inline-block w-8" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 shrink-0" />
                            {formatDate(log.created_at ?? log.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-border">
                              <AvatarFallback className="bg-gradient-to-br from-[#0c4a6e] to-[#1e40af] text-white text-xs font-semibold">
                                {getInitials(log.user_name ?? log.user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm">{log.user_name ?? log.user ?? 'Sistema'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getActionColor(log.event_type ?? log.type)} border`} variant="secondary">
                            {log.description ?? log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={log.subject_name ?? log.resource_name ?? log.resourceName}>
                          {log.subject_name ?? log.resource_name ?? log.resourceName ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs hidden md:table-cell">{log.ip ?? '—'}</TableCell>
                      </TableRow>
                      {hasDetails && isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-6 pb-4 pt-1">
                              <div className="rounded-lg border border-border bg-card overflow-hidden">
                                <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-foreground">Alterações (antes e depois)</span>
                                </div>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30">
                                        <TableHead className="font-semibold text-xs">Campo</TableHead>
                                        <TableHead className="font-semibold text-xs">Valor antigo</TableHead>
                                        <TableHead className="font-semibold text-xs">Valor novo</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {log.changes.map((change, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="text-sm font-medium">{change.field}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground font-mono max-w-[200px] truncate" title={formatChangeValue(change.old_value)}>
                                            {formatChangeValue(change.old_value)}
                                          </TableCell>
                                          <TableCell className="text-sm text-foreground font-mono max-w-[200px] truncate" title={formatChangeValue(change.new_value)}>
                                            {formatChangeValue(change.new_value)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                </TableBody>
              </table>
            </div>
          </div>
          <div className="flex-shrink-0">
            <PaginationBar pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPageChange} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
