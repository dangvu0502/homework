"""Output formatting utilities."""

from typing import Dict

from src.evaluate.calculate_metrics import calculate_metrics


def print_evaluation_results(tag_metrics: Dict[str, Dict[str, int]], show_errors: bool = False):
    """Print evaluation results in a formatted table with metrics."""
    # Adjust table width based on columns shown
    table_width = 88 if show_errors else 68
    
    print("\n" + "=" * table_width)
    print("EVALUATION RESULTS")
    print("=" * table_width)
    
    # Sort tags for consistent output
    tags = sorted(tag_metrics.keys())
    
    if not tags:
        print("No annotations found!")
        return
    
    # Print header
    if show_errors:
        print(f"{'Tag':<15} {'GT':<6} {'TP':<6} {'FP':<6} {'FN':<6} {'Precision':<10} {'Recall':<10} {'F1-Score':<10}")
    else:
        print(f"{'Tag':<15} {'GT':<6} {'TP':<6} {'Precision':<10} {'Recall':<10} {'F1-Score':<10}")
    print("-" * table_width)
    
    # Print metrics for each tag
    total_tp = total_fp = total_fn = 0
    
    for tag in tags:
        metrics = tag_metrics[tag]
        tp = metrics['tp']
        fp = metrics['fp']
        fn = metrics['fn']
        
        # Total ground truth = TP + FN
        total_gt = tp + fn
        
        precision, recall, f1 = calculate_metrics(tp, fp, fn)
        
        if show_errors:
            print(f"{tag:<15} {total_gt:<6} {tp:<6} {fp:<6} {fn:<6} {precision:<10.3f} {recall:<10.3f} {f1:<10.3f}")
        else:
            print(f"{tag:<15} {total_gt:<6} {tp:<6} {precision:<10.3f} {recall:<10.3f} {f1:<10.3f}")
        
        total_tp += tp
        total_fp += fp
        total_fn += fn
    
    # Calculate and print overall metrics
    print("-" * table_width)
    
    total_gt = total_tp + total_fn
    overall_precision, overall_recall, overall_f1 = calculate_metrics(total_tp, total_fp, total_fn)
    
    if show_errors:
        print(f"{'OVERALL':<15} {total_gt:<6} {total_tp:<6} {total_fp:<6} {total_fn:<6} "
              f"{overall_precision:<10.3f} {overall_recall:<10.3f} {overall_f1:<10.3f}")
    else:
        print(f"{'OVERALL':<15} {total_gt:<6} {total_tp:<6} "
              f"{overall_precision:<10.3f} {overall_recall:<10.3f} {overall_f1:<10.3f}")
    print("=" * table_width)
    
    # Print metric explanations
    print("\nMetric Definitions:")
    print("  GT = Ground Truth (total boxes)")
    print("  TP = True Positives (correctly predicted)")
    print("  FP = False Positives (incorrect predictions)")
    print("  FN = False Negatives (missed ground truth)")
    print("  Precision = TP / (TP + FP) - What fraction of predictions were correct?")
    print("  Recall    = TP / (TP + FN) - What fraction of ground truth was detected?")
    print("  F1-Score  = 2 * (Precision * Recall) / (Precision + Recall) - Harmonic mean")


def format_results_as_json(tag_metrics: Dict[str, Dict[str, int]], params: Dict) -> Dict:
    """Format evaluation results as JSON structure."""
    results = {
        'evaluation_params': params,
        'per_tag_metrics': {},
        'overall_metrics': {}
    }
    
    total_tp = total_fp = total_fn = 0
    
    for tag, counts in tag_metrics.items():
        tp, fp, fn = counts['tp'], counts['fp'], counts['fn']
        precision, recall, f1 = calculate_metrics(tp, fp, fn)
        
        results['per_tag_metrics'][tag] = {
            'total_ground_truth': tp + fn,
            'correctly_predicted': tp,
            'true_positives': tp,
            'false_positives': fp,
            'false_negatives': fn,
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4)
        }
        
        total_tp += tp
        total_fp += fp
        total_fn += fn
    
    # Overall metrics
    overall_precision, overall_recall, overall_f1 = calculate_metrics(total_tp, total_fp, total_fn)
    results['overall_metrics'] = {
        'total_ground_truth': total_tp + total_fn,
        'correctly_predicted': total_tp,
        'true_positives': total_tp,
        'false_positives': total_fp,
        'false_negatives': total_fn,
        'precision': round(overall_precision, 4),
        'recall': round(overall_recall, 4),
        'f1_score': round(overall_f1, 4)
    }
    
    return results