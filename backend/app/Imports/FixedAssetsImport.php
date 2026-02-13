<?php

namespace App\Imports;

use App\Models\Category;
use App\Models\Department;
use App\Models\FixedAsset;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class FixedAssetsImport implements ToModel, WithHeadingRow
{
    /**
     * @param array $row Cabeçalhos normalizados (slug): etiqueta, nome, ns ou n_s, marca, categoria, departamento, status, data_aquisicao, valor, etc.
     */
    public function model(array $row): ?FixedAsset
    {
        $etiqueta = $this->get($row, ['etiqueta']);
        $nome = $this->get($row, ['nome', 'name']);
        if (trim((string) $etiqueta) === '' || trim((string) $nome) === '') {
            return null;
        }

        $patrimonyCode = str_pad(trim((string) $etiqueta), 5, '0', STR_PAD_LEFT);
        $serialNumber = $this->get($row, ['ns', 'n_s', 'numero_serie']) ?: null;
        $serialNumber = $serialNumber !== null && trim((string) $serialNumber) !== '' ? trim((string) $serialNumber) : null;

        $categoryName = $this->get($row, ['categoria', 'category']) ?: 'Geral';
        $departmentName = $this->get($row, ['departamento', 'department']) ?: 'Almoxarifado';
        $category = Category::firstOrCreate(['name' => trim($categoryName)]);
        $department = Department::firstOrCreate(['name' => trim($departmentName)]);

        $statusRaw = $this->get($row, ['status']);
        $status = $this->normalizeStatus($statusRaw);

        $acquisitionDate = $this->parseDate($this->get($row, ['data_aquisicao', 'data']));
        $acquisitionValue = $this->parseValue($this->get($row, ['valor', 'value', 'valor_aquisicao']));

        return new FixedAsset([
            'patrimony_code' => $patrimonyCode,
            'serial_number' => $serialNumber,
            'name' => trim((string) $nome),
            'brand' => $this->trimOrNull($this->get($row, ['marca', 'brand'])),
            'description' => $this->trimOrNull($this->get($row, ['descricao', 'description'])),
            'category_id' => $category->id,
            'department_id' => $department->id,
            'status' => $status,
            'acquisition_date' => $acquisitionDate,
            'acquisition_value' => $acquisitionValue,
            'invoice_number' => $this->trimOrNull($this->get($row, ['nota_fiscal', 'invoice_number'])),
        ]);
    }

    private function get(array $row, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $row)) {
                $v = $row[$key];
                if ($v !== null && (string) $v !== '') {
                    return $v;
                }
            }
        }
        return null;
    }

    private function trimOrNull(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }
        return trim((string) $value);
    }

    private function normalizeStatus(mixed $value): string
    {
        $v = strtolower(trim((string) $value));
        if ($v === 'ativo' || $v === 'active' || $v === '1' || $v === 'sim') {
            return 'active';
        }
        if ($v === 'manutencao' || $v === 'maintenance') {
            return 'maintenance';
        }
        if ($v === 'baixado' || $v === 'written_off' || $v === 'inativo' || $v === 'inactive') {
            return 'written_off';
        }
        if ($v === 'reservado' || $v === 'reserved') {
            return 'reserved';
        }
        return 'written_off';
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || (string) $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject((float) $value);
                return $dt->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function parseValue(mixed $value): ?float
    {
        if ($value === null || (string) $value === '') {
            return null;
        }
        $str = preg_replace('/[^\d,.\-]/', '', (string) $value);
        $str = str_replace(',', '.', $str);
        if ($str === '' || !is_numeric($str)) {
            return null;
        }
        return (float) $str;
    }
}
