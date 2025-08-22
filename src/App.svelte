<script>
	import StockChart from './StockChart.svelte';
</script>

<main>
	<h1>Stock Performance Dashboard</h1>
	<StockChart />
</main>

<style>
	main {
		padding: 20px;
		max-width: 1200px;
		margin: 0 auto;
	}

	h1 {
		color: #333;
		text-align: center;
		font-size: 2.5em;
		font-weight: 300;
		margin-bottom: 30px;
	}

	@media (max-width: 768px) {
		main {
			padding: 10px;
		}
		
		h1 {
			font-size: 2em;
			margin-bottom: 20px;
		}
	}
</style>