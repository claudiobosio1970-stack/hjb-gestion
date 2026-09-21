-- =========================================================================================
-- CONSULTAS SQL DE EXTRACCIÓN - DELAVAL DELPRO FARMMANAGER
-- ESTABLECIMIENTO HERNÁN JOSÉ BOSIO (HJB)
-- =========================================================================================
-- Base de datos típica: DelProFarmManager (o DelPro)
-- Instancia SQL típica: localhost\DELPRO o SRV-DELPRO\DELPRO
-- 
-- IMPORTANTE: Todas las consultas utilizan 'WITH (NOLOCK)' para garantizar que sean
-- estrictamente de lectura y NUNCA bloqueen las tablas durante los turnos de ordeño.
-- =========================================================================================

USE [DelProFarmManager];
GO

-- -----------------------------------------------------------------------------------------
-- 1. PRODUCCIÓN DIARIA DE LECHE Y RODEO EN ORDEÑE (VO)
-- Extrae los litros totales ordeñados en las últimas 24 horas y el promedio por vaca
-- -----------------------------------------------------------------------------------------
SELECT 
    COUNT(DISTINCT dm.AnimalOID) AS VacasEnOrdeñe,
    ROUND(SUM(dm.TotalYield), 1) AS LitrosTotalesDia,
    ROUND(AVG(dm.TotalYield), 2) AS LitrosPromedioVO,
    MAX(dm.YieldDate) AS UltimaFechaMedicion
FROM DailyMilkYield dm WITH (NOLOCK)
WHERE dm.YieldDate >= CAST(DATEADD(day, -1, GETDATE()) AS DATE);
GO

-- Consulta alternativa por sesiones de ordeño (si no existe tabla agregada DailyMilkYield):
/*
SELECT 
    COUNT(DISTINCT ms.AnimalOID) AS VacasEnOrdeñe,
    ROUND(SUM(ms.Yield), 1) AS LitrosTotalesDia,
    ROUND(SUM(ms.Yield) / NULLIF(COUNT(DISTINCT ms.AnimalOID), 0), 2) AS LitrosPromedioVO
FROM MilkingSession ms WITH (NOLOCK)
WHERE ms.StartTime >= DATEADD(hour, -24, GETDATE());
*/

-- -----------------------------------------------------------------------------------------
-- 2. VACAS PREPARTO Y TRANSICIÓN (Lote Secas)
-- Cuenta vacas confirmadas preñadas en período de secado / próximas al parto
-- -----------------------------------------------------------------------------------------
SELECT 
    COUNT(DISTINCT a.OID) AS VacasPrepartoSecas
FROM Animal a WITH (NOLOCK)
WHERE a.LactationStatus IN (0, 2) -- 0: Seca, 2: Preparto
  AND a.Pregnant = 1
  AND a.ExpectedCalvingDate BETWEEN GETDATE() AND DATEADD(day, 60, GETDATE());
GO

-- -----------------------------------------------------------------------------------------
-- 3. DIETA ACTIVA Y RACIONES ASIGNADAS
-- Extrae los kilogramos diarios promedio formulados por vaca en ordeñe
-- -----------------------------------------------------------------------------------------
SELECT 
    fi.Name AS IngredienteAlimento,
    ROUND(AVG(fr.TargetAmount), 2) AS RacionPromedioKgDia,
    COUNT(DISTINCT fr.AnimalOID) AS VacasAsignadas
FROM FeedRation fr WITH (NOLOCK)
JOIN FeedIngredient fi WITH (NOLOCK) ON fr.IngredientOID = fi.OID
WHERE fr.IsActive = 1
GROUP BY fi.Name
ORDER BY RacionPromedioKgDia DESC;
GO

-- -----------------------------------------------------------------------------------------
-- 4. PARTOS RECIENTES Y SEGREGACIÓN BIOLÓGICA HJB
-- REGLA HJB: 
--   - Hembras (Sex = 2) -> 100% al Tambo (Vaquillonas de Reposición)
--   - Machos  (Sex = 1) -> Engorde a Corral (Novillos para Frigorífico)
-- -----------------------------------------------------------------------------------------
SELECT TOP 20
    c.OID AS PartoId,
    CONVERT(VARCHAR(10), c.EventDate, 103) AS FechaParto,
    m.VisualID AS RPMadre,
    k.VisualID AS RPCria,
    CASE 
        WHEN k.Sex = 1 THEN 'Macho' 
        WHEN k.Sex = 2 THEN 'Hembra' 
        ELSE 'Indeterminado' 
    END AS Sexo,
    ROUND(ISNULL(k.BirthWeight, 38.0), 1) AS PesoNacimientoKg,
    CASE 
        WHEN k.Sex = 1 THEN 'Engorde / Novillo (Venta Comercial)'
        ELSE 'Tambo (Vaquillona de Reposición)'
    END AS DestinoHJB,
    'En Guachera' AS EstadoActual
FROM Calving c WITH (NOLOCK)
JOIN Animal m WITH (NOLOCK) ON c.MotherAnimalOID = m.OID
LEFT JOIN Animal k WITH (NOLOCK) ON c.CalfAnimalOID = k.OID
ORDER BY c.EventDate DESC;
GO
