<?php

namespace App\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

class HomeController
{
    public function index(Request $request)
    {
        // Récupérer les 5 derniers utilisateurs
        $users = User::orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Afficher la vue avec les données
        return View::make('home', [
            'users' => $users,
            'title' => 'Bienvenue sur Cody Code'
        ]);
    }

    public function about()
    {
        return View::make('about', [
            'title' => 'À propos de Cody Code'
        ]);
    }
}
