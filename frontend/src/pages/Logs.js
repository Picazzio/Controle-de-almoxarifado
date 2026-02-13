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
import { Search, Filter, Download, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import PaginationBar from '../components/PaginationBar';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
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
  }, [pagination.current_page, pagination.per_page]);

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

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actionTypes = [
    { value: 'created', label: 'Criação' },
    { value: 'updated', label: 'Edição' },
    { value: 'deleted', label: 'Exclusão' },
  ];
  const resourceTypes = ['Produto', 'Usuário', 'Movimentação', 'Permissão'];

  const getActionColor = (type) => {
    const t = type || '';
    if (t.includes('Criou') || t === 'created' || t === 'create') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (t.includes('Editou') || t === 'updated' || t === 'update') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('Excluiu') || t === 'deleted' || t === 'delete') return 'bg-red-100 text-red-700 border-red-200';
    if (t.includes('Visualizou') || t === 'read') return 'bg-muted text-foreground border-border';
    return 'bg-muted text-foreground border-border';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredLogs = logs;

  const exportToCSV = () => {
    const headers = ['ID', 'Usuário', 'Ação', 'Recurso', 'Nome do Recurso', 'Data/Hora', 'IP'];
    const csvData = filteredLogs.map(log => [
      log.id,
      log.user,
      log.action,
      log.resource,
      log.resource_name || log.resourceName,
      formatDate(log.timestamp),
      log.ip
    ]);
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Logs de Atividade</h1>
          <p className="text-muted-foreground mt-1">Acompanhe todas as ações realizadas no sistema</p>
        </div>
        <Button
          data-testid="export-logs-btn"
          onClick={exportToCSV}
          className="flex items-center gap-2 bg-gradient-to-r from-[#0c4a6e] to-[#1e40af]"
        >
          <Download className="w-4 h-4" />
          Exportar Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="search-logs-input"
                  placeholder="Buscar por usuário ou recurso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="filter-type-select">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Tipo de Ação" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ações</SelectItem>
                {actionTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterResource} onValueChange={setFilterResource}>
              <SelectTrigger data-testid="filter-resource-select">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <SelectValue placeholder="Recurso" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Recursos</SelectItem>
                {resourceTypes.map(resource => (
                  <SelectItem key={resource} value={resource}>{resource}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Usuário</TableHead>
                  <SortableTableHead columnKey="description" label="Ação" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortableTableHead columnKey="subject_type" label="Recurso" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold">Nome do Recurso</TableHead>
                  <SortableTableHead columnKey="created_at" label="Data/Hora" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <TableHead className="font-semibold">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} data-testid={`log-row-${log.id}`} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border-2 border-border">
                          <AvatarFallback className="bg-gradient-to-br from-[#0c4a6e] to-[#1e40af] text-white text-xs font-semibold">
                            {getInitials(log.user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{log.user}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getActionColor(log.type)} border`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{log.resource}</TableCell>
                    <TableCell className="text-muted-foreground">{log.resource_name || log.resourceName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="w-4 h-4" />
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{log.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            pagination={pagination}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            className="px-6 pb-4"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;