<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::query();
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where('name', 'like', "%{$s}%");
        }
        $sortBy = $request->get('sort_by', 'name');
        $sortDir = strtolower($request->get('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSort = ['id', 'name', 'created_at'];
        if (in_array($sortBy, $allowedSort)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('name', 'asc');
        }
        $categories = $query->get(['id', 'name', 'created_at']);
        $items = $categories->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'created_at' => $c->created_at->toIso8601String(),
        ]);
        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para cadastrar categorias.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name',
        ]);
        $category = Category::create(['name' => $request->name]);
        return response()->json([
            'id' => $category->id,
            'name' => $category->name,
            'created_at' => $category->created_at->toIso8601String(),
        ], 201);
    }

    public function show(Request $request, Category $category): JsonResponse
    {
        return response()->json([
            'id' => $category->id,
            'name' => $category->name,
            'created_at' => $category->created_at->toIso8601String(),
        ]);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para editar categorias.'], 403);
        }
        $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id,
        ]);
        $category->update(['name' => $request->name]);
        return response()->json([
            'id' => $category->id,
            'name' => $category->name,
            'created_at' => $category->created_at->toIso8601String(),
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        if (!$request->user()->can('manage_users')) {
            return response()->json(['message' => 'Sem permissão para excluir categorias.'], 403);
        }
        if ($category->assets()->exists()) {
            return response()->json(['message' => 'Não é possível excluir categoria com produtos vinculados.'], 422);
        }
        $category->delete();
        return response()->json(null, 204);
    }
}
