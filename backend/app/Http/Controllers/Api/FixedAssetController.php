<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\FixedAssetsImport;
use App\Models\FixedAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class FixedAssetController extends Controller
{
    private const PATRIMONY_CODE_LENGTH = 5;

    private function normalizePatrimonyCode(?string $value): string
    {
        $trimmed = trim((string) $value);
        return str_pad($trimmed, self::PATRIMONY_CODE_LENGTH, '0', STR_PAD_LEFT);
    }

    public function index(Request $request): JsonResponse
    {
        $query = FixedAsset::with(['category:id,name', 'department:id,name,code']);
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('patrimony_code', 'like', "%{$s}%")
                    ->orWhere('serial_number', 'like', "%{$s}%")
                    ->orWhere('name', 'like', "%{$s}%")
                    ->orWhere('invoice_number', 'like', "%{$s}%");
            });
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        $sortBy = $request->get('sort_by', 'patrimony_code');
        $sortDir = strtolower($request->get('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['id', 'patrimony_code', 'serial_number', 'name', 'status', 'acquisition_date', 'acquisition_value', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('patrimony_code', 'asc');
        }
        $perPage = min((int) $request->get('per_page', 15), 100);
        $assets = $query->paginate($perPage);
        $assets->getCollection()->transform(fn ($a) => $this->formatItem($a));
        return response()->json($assets);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'patrimony_code' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'department_id' => 'required|exists:departments,id',
            'status' => 'required|in:active,maintenance,written_off,reserved',
            'acquisition_date' => 'nullable|date',
            'acquisition_value' => 'nullable|numeric|min:0',
            'invoice_number' => 'nullable|string|max:255',
        ], [
            'patrimony_code.required' => 'A etiqueta é obrigatória.',
            'name.required' => 'O nome é obrigatório.',
            'category_id.required' => 'Selecione uma categoria.',
            'department_id.required' => 'Selecione um departamento.',
        ]);

        $code = $this->normalizePatrimonyCode($request->patrimony_code);
        if (FixedAsset::where('patrimony_code', $code)->exists()) {
            return response()->json(['message' => 'Esta etiqueta já está em uso.', 'errors' => ['patrimony_code' => ['Esta etiqueta já está em uso.']]], 422);
        }

        $data = $request->only([
            'serial_number', 'name', 'brand', 'description',
            'category_id', 'department_id', 'status',
            'acquisition_date', 'acquisition_value', 'invoice_number',
        ]);
        $data['patrimony_code'] = $code;
        $asset = FixedAsset::create($data);
        $asset->load(['category:id,name', 'department:id,name,code']);
        return response()->json($this->formatItem($asset), 201);
    }

    public function show(Request $request, FixedAsset $fixedAsset): JsonResponse
    {
        $fixedAsset->load(['category:id,name', 'department:id,name,code']);
        return response()->json($this->formatItem($fixedAsset));
    }

    public function update(Request $request, FixedAsset $fixedAsset): JsonResponse
    {
        $request->validate([
            'patrimony_code' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'department_id' => 'required|exists:departments,id',
            'status' => 'required|in:active,maintenance,written_off,reserved',
            'acquisition_date' => 'nullable|date',
            'acquisition_value' => 'nullable|numeric|min:0',
            'invoice_number' => 'nullable|string|max:255',
        ], [
            'name.required' => 'O nome é obrigatório.',
            'category_id.required' => 'Selecione uma categoria.',
            'department_id.required' => 'Selecione um departamento.',
        ]);

        $code = $this->normalizePatrimonyCode($request->patrimony_code);
        if (FixedAsset::where('patrimony_code', $code)->where('id', '!=', $fixedAsset->id)->exists()) {
            return response()->json(['message' => 'Esta etiqueta já está em uso.', 'errors' => ['patrimony_code' => ['Esta etiqueta já está em uso.']]], 422);
        }

        $data = $request->only([
            'serial_number', 'name', 'brand', 'description',
            'category_id', 'department_id', 'status',
            'acquisition_date', 'acquisition_value', 'invoice_number',
        ]);
        $data['patrimony_code'] = $code;
        $fixedAsset->update($data);
        $fixedAsset->load(['category:id,name', 'department:id,name,code']);
        return response()->json($this->formatItem($fixedAsset));
    }

    public function destroy(Request $request, FixedAsset $fixedAsset): JsonResponse
    {
        $fixedAsset->delete();
        return response()->json(null, 204);
    }

    /**
     * Importa patrimônios a partir de arquivo Excel (.xlsx) ou CSV.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:10240',
                'mimetypes:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain,application/csv,text/comma-separated-values',
            ],
        ], [
            'file.required' => 'Selecione um arquivo para importar.',
            'file.mimetypes' => 'O arquivo deve ser Excel (.xlsx) ou CSV.',
        ]);

        Excel::import(new FixedAssetsImport, $request->file('file'));

        return response()->json([
            'message' => 'Importação concluída com sucesso.',
        ]);
    }

    private function formatItem(FixedAsset $a): array
    {
        return [
            'id' => $a->id,
            'patrimony_code' => $this->normalizePatrimonyCode($a->patrimony_code),
            'serial_number' => $a->serial_number,
            'name' => $a->name,
            'brand' => $a->brand,
            'description' => $a->description,
            'category_id' => $a->category_id,
            'category' => $a->category?->name,
            'department_id' => $a->department_id,
            'department' => $a->department?->name,
            'department_code' => $a->department?->code,
            'status' => $a->status,
            'acquisition_date' => $a->acquisition_date?->format('Y-m-d'),
            'acquisition_value' => $a->acquisition_value !== null ? (float) $a->acquisition_value : null,
            'invoice_number' => $a->invoice_number,
            'created_at' => $a->created_at->toIso8601String(),
            'updated_at' => $a->updated_at->toIso8601String(),
        ];
    }
}
